import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ReferralService } from "./referral.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@Controller("referral")
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  // 1. Foydalanuvchi uchun shaxsiy referral kod va linkni olish
  @Get("my-code")
  @UseGuards(JwtAuthGuard)
  async getMyReferralCode(@CurrentUser() user: { id: number }) {
    const code = await this.referralService.generateReferralCode(user.id);
    const link = `https://zehngoh.uz/?ref=${code}`;

    return {
      referralCode: code,
      referralLink: link,
    };
  }

  // 2. Referral statistikasi (bonus balans, taklif qilingan do‘stlar soni)
  @Get("stats")
  @UseGuards(JwtAuthGuard)
  async getReferralStats(@CurrentUser() user: { id: number }) {
    return this.referralService.getReferralStats(user.id);
  }

  // 3. Referral orqali kirishni qayd etish (frontenddan chaqiriladi, masalan, ?ref=... bilan kirganda)
  @Get("track/:code")
  async trackReferral(
    @Param("code") code: string,
    @CurrentUser() user?: { id: number }
  ) {
    // Agar user allaqachon login qilgan bo‘lsa — referredId ni bog‘lash
    if (user) {
      await this.referralService.trackReferral(code, user.id);
    }
    return { message: "Referral tracked" };
  }
}
