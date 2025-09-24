import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common'
import { AuthService } from './auth.service'
import { SendCodeDto } from './dto/send-code.dto'
import { VerifyCodeDto } from './dto/verify-code.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'

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
  async verify(@Body() dto: VerifyCodeDto) {
    const { token, user } = await this.auth.verify(dto.phone, dto.code, dto.deviceInfo)
    return { token, user: { id: user.id, phone: user.phone, fullName: user.fullName ?? null } }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: any) {
    return await this.auth.getProfile(user.id)
  }

  @Post('google')
  @HttpCode(200)
  async google(@Body() body: { credential: string; deviceInfo?: string }) {
    const { token, user } = await this.auth.verifyGoogle(body.credential, body.deviceInfo)
    return { token, user: { id: user.id, phone: user.phone ?? null, fullName: user.fullName ?? null } }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async logout(@Req() req: any) {
    const authHeader = req.headers['authorization'] as string | undefined
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined
    await this.auth.logout(token!)
    return { success: true }
  }
}
