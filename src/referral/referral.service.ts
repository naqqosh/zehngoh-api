import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReferralService {
  constructor(private prisma: PrismaService) {}

  async generateReferralCode(userId: number): Promise<string> {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });
    if (existing?.referralCode) return existing.referralCode;

    const code = `${userId}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    await this.prisma.user.update({
      where: { id: userId },
      data: { referralCode: code },
    });

    return code;
  }

  async trackReferral(referralCode: string, newUserId: number): Promise<void> {
    const referrer = await this.prisma.user.findUnique({
      where: { referralCode },
      select: { id: true },
    });

    if (!referrer || referrer.id === newUserId) return; // self-referral blok

    // Check if already tracked
    const existing = await this.prisma.referral.findFirst({
      where: {
        referrerId: referrer.id,
        referredId: newUserId,
      },
    });
    if (existing) return;

    await this.prisma.referral.create({
      data: {
        referrerId: referrer.id,
        referredId: newUserId,
        referralCode,
        status: "PENDING",
      },
    });
  }

  async processBonus(orderId: number): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order) return;

    const referral = await this.prisma.referral.findFirst({
      where: {
        referredId: order.userId,
        status: "PENDING",
      },
    });

    if (!referral) return;

    const bonus = Number(order.totalAmountUzs) * 0.1; // 10%

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: referral.referrerId },
        data: { referralBonusBalance: { increment: bonus } },
      }),
      this.prisma.referral.update({
        where: { id: referral.id },
        data: {
          status: "COMPLETED",
          bonusAmount: bonus,
          firstOrderId: orderId,
        },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: { referrerBonusApplied: bonus, referrerId: referral.referrerId },
      }),
    ]);
  }

  async getReferralStats(userId: number) {
    const [referrals, userData] = await Promise.all([
      this.prisma.referral.count({ where: { referrerId: userId } }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { referralBonusBalance: true, referralCode: true },
      }),
    ]);

    return {
      referralCode: userData?.referralCode,
      referredCount: referrals,
      bonusBalance: userData?.referralBonusBalance || 0,
    };
  }
}
