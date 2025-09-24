import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common'
import { FeedbackService } from './feedback.service'
import { CreateNotFoundDto } from './dto/create-not-found.dto'
import type { Request } from 'express'
import { JwtService } from '@nestjs/jwt'

@Controller('feedback')
export class FeedbackController {
  constructor(private service: FeedbackService, private jwt: JwtService) {}

  @Post('not-found')
  @HttpCode(201)
  async notFound(@Body() dto: CreateNotFoundDto, @Req() req: Request) {
    const userAgent = (req.headers['user-agent'] as string) || undefined
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip
    let userId: number | undefined
    const auth = (req.headers['authorization'] as string) || ''
    if (auth.startsWith('Bearer ')) {
      const token = auth.slice(7)
      try {
        const payload: any = await this.jwt.verifyAsync(token, { secret: process.env.JWT_SECRET || 'dev_secret' })
        if (payload?.id && typeof payload.id === 'number') userId = payload.id
      } catch {}
    }
    await this.service.createNotFound({
      query: dto.query.trim(),
      pageUrl: dto.pageUrl,
      userAgent,
      ip,
      userId,
    })
    return { ok: true }
  }
}

