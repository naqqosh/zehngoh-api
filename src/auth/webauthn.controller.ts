import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common'
import { WebAuthnService } from './webauthn.service'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'

function originFromReq(req: Request): { origin?: string; rpID?: string } {
  const o = (req.headers['origin'] as string | undefined) || undefined
  if (!o) return {}
  try {
    const url = new URL(o)
    return { origin: o, rpID: url.hostname }
  } catch {
    return {}
  }
}

@Controller('auth/webauthn')
export class WebAuthnController {
  constructor(private webauthn: WebAuthnService, private jwt: JwtService) {}

  @Post('register/options')
  @HttpCode(200)
  async regOptions(@Body() body: { displayName?: string }, @Req() req: Request) {
    const { origin, rpID } = originFromReq(req)
    const { sessionId, options } = await this.webauthn.createRegistrationOptions({
      displayName: body?.displayName,
      origin,
      rpID,
    })
    return { sessionId, publicKey: options }
  }

  @Post('register/verify')
  async regVerify(
    @Body()
    body: {
      sessionId: string
      response: any
      deviceInfo?: string
    },
  ) {
    const { userId } = await this.webauthn.verifyRegistrationResponse(body.sessionId, body.response)
    const payload = { id: userId, phone: null, role: 'user' as const }
    const token = await this.jwt.signAsync(payload)
    return { token, user: { id: userId, phone: null, fullName: null } }
  }

  @Post('login/options')
  @HttpCode(200)
  async authOptions(@Req() req: Request) {
    const { origin, rpID } = originFromReq(req)
    const { sessionId, options } = await this.webauthn.createAuthenticationOptions({ origin, rpID })
    return { sessionId, publicKey: options }
  }

  @Post('login/verify')
  async authVerify(@Body() body: { sessionId: string; response: any; deviceInfo?: string }) {
    const { userId } = await this.webauthn.verifyAuthenticationResponse(body.sessionId, body.response)
    const payload = { id: userId, phone: null, role: 'user' as const }
    const token = await this.jwt.signAsync(payload)
    return { token, user: { id: userId, phone: null, fullName: null } }
  }
}
