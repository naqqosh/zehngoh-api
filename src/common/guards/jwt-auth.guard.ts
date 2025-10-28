import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../../prisma/prisma.service'
import * as dayjs from 'dayjs'

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest()
    const authHeader = req.headers['authorization'] as string | undefined
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined

    if (!token) throw new UnauthorizedException('Missing bearer token')
    try {
      const payload = await this.jwt.verifyAsync(token, { secret: process.env.JWT_SECRET || 'dev_secret' }) as any
      const sessionId = payload?.sid
      if (!sessionId) throw new UnauthorizedException('Invalid session token')
      // Check session exists and is not revoked/expired
      const session = await this.prisma.userSession.findUnique({ where: { id: sessionId } })
      if (!session) throw new UnauthorizedException('Session not found')
      if (session.revokedAt) throw new UnauthorizedException('Session revoked')
      if (dayjs(session.expiresAt).isBefore(dayjs())) throw new UnauthorizedException('Session expired')
      // Optionally update lastSeen asynchronously (no await to avoid latency)
      this.prisma.userSession
        .update({ where: { id: sessionId }, data: { lastSeen: new Date() } })
        .catch(() => {})
      req.user = payload
      ;(req as any).session = session
      return true
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired token')
    }
  }
}
