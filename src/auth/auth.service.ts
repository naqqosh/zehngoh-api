import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { JwtService } from '@nestjs/jwt'
import * as dayjs from 'dayjs'
import { TelegramGatewayService } from './telegram-gateway.service'
import { OAuth2Client } from 'google-auth-library'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private telegramGateway: TelegramGatewayService,
  ) {}

  private generateCode() {
    if (process.env.NODE_ENV !== 'production') return '12345'
    return Math.floor(10000 + Math.random() * 90000).toString()
  }

  async sendCode(phone: string) {
    // Normalize to E.164, but store digits in DB; use E.164 for gateway
    const normalizedDigits = phone.replace(/\D/g, '')
    // Ensure user exists (create on-demand)
    let user = await this.prisma.user.findUnique({ where: { phone: normalizedDigits } })
    if (!user) {
      user = await this.prisma.user.create({ data: { phone: normalizedDigits } })
    }

    // rate-limit: 60s between sends
    const last = await this.prisma.otpCode.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })
    if (last && dayjs().diff(dayjs(last.createdAt), 'second') < 60 && !last.usedAt) {
      const wait = 60 - dayjs().diff(dayjs(last.createdAt), 'second')
      throw new BadRequestException(`Iltimos, ${wait} soniyadan so'ng qaytadan urinib ko'ring`)
    }

    // Invalidate previous active codes
    await this.prisma.otpCode.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } })

    const code = this.generateCode()
    const expiresAt = dayjs().add(5, 'minute').toDate()
    const record = await this.prisma.otpCode.create({
      data: { userId: user.id, code, expiresAt, purpose: 'login', attempts: 0, provider: 'telegram_gateway' },
    })

    // Send via Telegram Gateway
    try {
      const phoneE164 = this.telegramGateway.normalizePhone(normalizedDigits)
      const res = await this.telegramGateway.sendOtp(phoneE164, code, 300)
      await this.prisma.otpCode.update({
        where: { id: record.id },
        data: { gatewayMessageId: res.id ?? null, deliveryStatus: res.status ?? null },
      })
    } catch (e) {
      // Rollback usage so user can retry later
      await this.prisma.otpCode.update({ where: { id: record.id }, data: { usedAt: new Date() } })
      throw e
    }

    return { expiresInSec: 5 * 60, resendAfterSec: 60 }
  }

  async verify(phone: string, code: string, deviceInfo?: string) {
    const normalized = phone.replace(/\D/g, '')
    const user = await this.prisma.user.findUnique({ where: { phone: normalized } })
    if (!user) throw new UnauthorizedException('User not found')

    const otp = await this.prisma.otpCode.findFirst({
      where: { userId: user.id, usedAt: null, purpose: 'login' },
      orderBy: { createdAt: 'desc' },
    })
    if (!otp) throw new UnauthorizedException('Invalid code')
    if (dayjs(otp.expiresAt).isBefore(dayjs())) {
      await this.prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } })
      throw new UnauthorizedException('Code expired')
    }

    const MAX_ATTEMPTS = 3
    if (otp.attempts >= MAX_ATTEMPTS) {
      await this.prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } })
      throw new UnauthorizedException('Too many attempts')
    }

    if (otp.code !== code) {
      await this.prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } })
      throw new UnauthorizedException(`Invalid code. ${MAX_ATTEMPTS - (otp.attempts + 1)} attempts left`)
    }

    await this.prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } })

    // create session token row and JWT
    const payload = { id: user.id, phone: user.phone, role: 'user' as const }
    const token = await this.jwt.signAsync(payload)

    const expiresAt = dayjs().add(30, 'day').toDate()
    await this.prisma.userSession.create({
      data: { userId: user.id, token, deviceInfo, expiresAt },
    })

    return { token, user }
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new UnauthorizedException()
    return { id: user.id, phone: user.phone, fullName: user.fullName ?? null }
  }

  async verifyGoogle(credential: string, deviceInfo?: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID
    if (!clientId) throw new BadRequestException('Missing GOOGLE_CLIENT_ID')
    const client = new OAuth2Client(clientId)
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId })
    const payload = ticket.getPayload()
    if (!payload) throw new UnauthorizedException('Invalid Google credential')
    const { sub, email, name, email_verified } = payload
    if (!email || email_verified === false) throw new UnauthorizedException('Email not verified')

    // Find or create user
    let user = await this.prisma.user.findFirst({ where: { OR: [{ googleId: sub }, { email }] } })
    if (!user) {
      user = await this.prisma.user.create({ data: { email, fullName: name || null, googleId: sub } })
    } else if (!user.googleId) {
      user = await this.prisma.user.update({ where: { id: user.id }, data: { googleId: sub, fullName: user.fullName || name || null } })
    }

    // Issue JWT + session
    const jwtPayload = { id: user.id, phone: user.phone ?? null, role: 'user' as const }
    const token = await this.jwt.signAsync(jwtPayload)
    const expiresAt = dayjs().add(30, 'day').toDate()
    await this.prisma.userSession.create({ data: { userId: user.id, token, deviceInfo, expiresAt } })

    return { token, user }
  }

  async logout(token: string) {
    if (!token) throw new BadRequestException('Missing token')
    const session = await this.prisma.userSession.findUnique({ where: { token } })
    if (!session) return { success: true }
    if (session.revokedAt) return { success: true }
    await this.prisma.userSession.update({ where: { token }, data: { revokedAt: new Date() } })
    return { success: true }
  }
}
