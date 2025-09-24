import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'

@Injectable()
export class TelegramGatewayService {
  private readonly logger = new Logger(TelegramGatewayService.name)
  private baseUrl = process.env.TELEGRAM_GATEWAY_API_BASE || 'https://gateway.telegram.org'
  private token = process.env.TELEGRAM_GATEWAY_TOKEN || ''

  private headers() {
    if (!this.token) throw new Error('TELEGRAM_GATEWAY_TOKEN is not set')
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
    }
  }

  // Normalize to E.164. Here we assume only UZB numbers used in UI flow
  normalizePhone(phone: string) {
    const digits = phone.replace(/\D/g, '')
    if (digits.startsWith('998')) return `+${digits}`
    if (digits.length === 9) return `+998${digits}`
    if (digits.startsWith('0') && digits.length === 10) return `+998${digits.slice(1)}`
    if (phone.startsWith('+')) return phone
    return `+${digits}`
  }

  async sendOtp(phone: string, code: string, ttlSeconds = 300): Promise<{ id?: string; status: string }> {
    const payload = {
      phone: this.normalizePhone(phone),
      template_id: process.env.TELEGRAM_GATEWAY_TEMPLATE_ID || undefined,
      text:
        process.env.TELEGRAM_GATEWAY_TEMPLATE_ID
          ? undefined
          : `Zehngoh tasdiqlash kodi: ${code}. Kod ${Math.floor(ttlSeconds / 60)} daqiqada eskiradi.`,
      variables: { code },
      ttl_seconds: ttlSeconds,
      purpose: 'login',
    }

    try {
      const { data } = await axios.post(`${this.baseUrl}/send`, payload, { headers: this.headers() })
      return { id: data?.id, status: data?.status || 'sent' }
    } catch (err: any) {
      const status = err?.response?.status
      const text = err?.response?.data ? JSON.stringify(err.response.data) : String(err)
      this.logger.error(`Telegram Gateway send failed: ${status} ${text}`)
      throw new Error(`Telegram Gateway error: ${status || 'request_failed'}`)
    }
  }
}
