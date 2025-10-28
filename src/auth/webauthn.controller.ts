import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common'
import { WebAuthnService } from './webauthn.service'
import type { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { setRefreshTokenCookie } from './refresh-token.util'

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
  constructor(private webauthn: WebAuthnService, private auth: AuthService) {}

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
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { userId } = await this.webauthn.verifyRegistrationResponse(body.sessionId, body.response)
    const deviceInfo = body.deviceInfo || (req.headers['user-agent'] as string | undefined)
    const { accessToken, refreshToken, user } = await this.auth.createSessionForUser(userId, deviceInfo)
    setRefreshTokenCookie(res, refreshToken)
    return { token: accessToken, user }
  }

  @Post('login/options')
  @HttpCode(200)
  async authOptions(@Req() req: Request) {
    const { origin, rpID } = originFromReq(req)
    const { sessionId, options } = await this.webauthn.createAuthenticationOptions({ origin, rpID })
    return { sessionId, publicKey: options }
  }

  @Post('login/verify')
  async authVerify(
    @Body() body: { sessionId: string; response: any; deviceInfo?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { userId } = await this.webauthn.verifyAuthenticationResponse(body.sessionId, body.response)
    const deviceInfo = body.deviceInfo || (req.headers['user-agent'] as string | undefined)
    const { accessToken, refreshToken, user } = await this.auth.createSessionForUser(userId, deviceInfo)
    setRefreshTokenCookie(res, refreshToken)
    return { token: accessToken, user }
  }
}
