import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Controller('telegram-gateway')
export class TelegramGatewayController {
  constructor(private prisma: PrismaService) {}

  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Headers('x-webhook-secret') secret: string | undefined,
    @Body() body: any,
  ) {
    const expected = process.env.TELEGRAM_GATEWAY_WEBHOOK_SECRET
    if (expected && secret !== expected) {
      return { ok: false }
    }

    const gatewayId = body?.id || body?.messageId || body?.msg_id || null
    const status = body?.status || body?.delivery_status || null
    const phone = body?.phone || body?.to || null
    const error = body?.error || body?.reason || null

    if (!gatewayId && !phone) return { ok: true }

    if (gatewayId) {
      await this.prisma.otpCode.updateMany({
        where: { gatewayMessageId: String(gatewayId) },
        data: { deliveryStatus: status, deliveryError: error ?? null },
      })
    } else if (phone) {
      const digits = String(phone).replace(/\D/g, '')
      const user = await this.prisma.user.findFirst({ where: { phone: digits } })
      if (user) {
        const last = await this.prisma.otpCode.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
        })
        if (last) {
          await this.prisma.otpCode.update({
            where: { id: last.id },
            data: { deliveryStatus: status, deliveryError: error ?? null },
          })
        }
      }
    }

    return { ok: true }
  }
}

