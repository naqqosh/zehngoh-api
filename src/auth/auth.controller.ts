import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common'
import { AuthService } from './auth.service'
import { SendCodeDto } from './dto/send-code.dto'
import { VerifyCodeDto } from './dto/verify-code.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { Request, Response } from 'express'
import {
  REFRESH_TOKEN_COOKIE_NAME,
  clearRefreshTokenCookie,
  setRefreshTokenCookie,
} from './refresh-token.util'

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Note: OTP endpoints kept for backward-compat but UI should hide/comment them in MVP
  @Post('send-code')
  @HttpCode(200)
  async sendCode(@Body() dto: SendCodeDto) {
    const result = await this.auth.sendCode(dto.phone)
    return { success: true, expiresInSec: result.expiresInSec }
  }

  @Post('verify')
  async verify(@Body() dto: VerifyCodeDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const deviceInfo = dto.deviceInfo || (req.headers['user-agent'] as string | undefined)
    const { accessToken, refreshToken, user } = await this.auth.verify(dto.phone, dto.code, deviceInfo)
    setRefreshTokenCookie(res, refreshToken)
    return { token: accessToken, user }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: any) {
    return await this.auth.getProfile(user.id)
  }

  @Post('google')
  @HttpCode(200)
  async google(
    @Body() body: { credential: string; deviceInfo?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const deviceInfo = body.deviceInfo || (req.headers['user-agent'] as string | undefined)
    const { accessToken, refreshToken, user } = await this.auth.verifyGoogle(body.credential, deviceInfo)
    setRefreshTokenCookie(res, refreshToken)
    return { token: accessToken, user }
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME]
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token')
    const deviceInfo = req.headers['user-agent'] as string | undefined
    const { accessToken, refreshToken: newRefreshToken, user } = await this.auth.refreshSession(refreshToken, deviceInfo)
    setRefreshTokenCookie(res, newRefreshToken)
    return { token: accessToken, user }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const sessionIdRaw = req.user?.sid
    const sessionId = typeof sessionIdRaw === 'number' ? sessionIdRaw : Number(sessionIdRaw)
    if (sessionId) {
      await this.auth.logout(sessionId)
    }
    clearRefreshTokenCookie(res)
    return { success: true }
  }
}
