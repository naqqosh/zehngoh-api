import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import dayjs from "dayjs";
import { TelegramGatewayService } from "./telegram-gateway.service";
import { createHash, randomBytes } from "crypto";
import type { User } from "@prisma/client";
import { ReferralService } from "../referral/referral.service";
// import { auth } from "./firebase-admin";
// import { OAuth2Client } from "google-auth-library";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private telegramGateway: TelegramGatewayService,
    private referralService: ReferralService,
  ) {}

  private readonly refreshTokenTtlDays = Number(
    process.env.REFRESH_TOKEN_TTL_DAYS || 30,
  );

  private readonly accessTokenTtl = process.env.ACCESS_TOKEN_TTL || "15m";

  private generateCode() {
    if (process.env.NODE_ENV !== "production") return "12345";
    return Math.floor(10000 + Math.random() * 90000).toString();
  }

  async setFullName(userId: number, fullName: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { fullName },
    });
    return this.toAuthUser(user);
  }

  private generateRefreshToken() {
    return randomBytes(48).toString("hex");
  }

  private hashRefreshToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private toAuthUser(user: User) {
    return {
      id: user.id,
      phone: user.phone ?? null,
      fullName: user.fullName ?? null,
    };
  }

  private async signAccessToken(user: User, sessionId: number) {
    return this.jwt.signAsync(
      {
        sub: user.id,
        id: user.id,
        phone: user.phone ?? null,
        role: "user" as const,
        sid: sessionId,
      },
      {
        expiresIn: this.accessTokenTtl,
        secret: process.env.JWT_SECRET || "dev_secret",
      },
    );
  }

  private async issueSession(user: User, deviceInfo?: string) {
    const refreshToken = this.generateRefreshToken();
    const expiresAt = dayjs().add(this.refreshTokenTtlDays, "day").toDate();
    const session = await this.prisma.userSession.create({
      data: {
        userId: user.id,
        token: this.hashRefreshToken(refreshToken),
        deviceInfo: deviceInfo || null,
        expiresAt,
      },
    });
    const accessToken = await this.signAccessToken(user, session.id);
    return {
      accessToken,
      refreshToken,
      user: this.toAuthUser(user),
    };
  }

  private async rotateSession(
    sessionId: number,
    user: User,
    deviceInfo?: string,
  ) {
    const refreshToken = this.generateRefreshToken();
    const expiresAt = dayjs().add(this.refreshTokenTtlDays, "day").toDate();
    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: {
        token: this.hashRefreshToken(refreshToken),
        expiresAt,
        revokedAt: null,
        deviceInfo: deviceInfo || null,
        lastSeen: new Date(),
      },
    });
    const accessToken = await this.signAccessToken(user, sessionId);
    return {
      accessToken,
      refreshToken,
      user: this.toAuthUser(user),
    };
  }

  async sendCode(phone: string) {
    // Normalize to E.164, but store digits in DB; use E.164 for gateway
    const normalizedDigits = phone.replace(/\D/g, "");
    // Ensure user exists (create on-demand)
    let user = await this.prisma.user.findUnique({
      where: { phone: normalizedDigits },
    });
    if (!user) {
      user = await this.prisma.user.create({
        data: { phone: normalizedDigits },
      });
    }

    // rate-limit: 60s between sends
    const last = await this.prisma.otpCode.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    if (
      last &&
      dayjs().diff(dayjs(last.createdAt), "second") < 60 &&
      !last.usedAt
    ) {
      const wait = 60 - dayjs().diff(dayjs(last.createdAt), "second");
      throw new BadRequestException(
        `Iltimos, ${wait} soniyadan so'ng qaytadan urinib ko'ring`,
      );
    }

    // Invalidate previous active codes
    await this.prisma.otpCode.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const code = this.generateCode();
    const expiresAt = dayjs().add(5, "minute").toDate();
    const record = await this.prisma.otpCode.create({
      data: {
        userId: user.id,
        code,
        expiresAt,
        purpose: "login",
        attempts: 0,
        provider: "telegram_gateway",
      },
    });

    // Send via Telegram Gateway
    try {
      const phoneE164 = this.telegramGateway.normalizePhone(normalizedDigits);
      const res = await this.telegramGateway.sendOtp(phoneE164, code, 300);
      await this.prisma.otpCode.update({
        where: { id: record.id },
        data: {
          gatewayMessageId: res.id ?? null,
          deliveryStatus: res.status ?? null,
        },
      });
    } catch (e) {
      // Rollback usage so user can retry later
      await this.prisma.otpCode.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });
      throw e;
    }

    return { expiresInSec: 5 * 60, resendAfterSec: 60 };
  }

  async verify(
    phone: string,
    code: string,
    deviceInfo?: string,
    referralCode?: string,
  ) {
    const normalized = phone.replace(/\D/g, "");
    const user = await this.prisma.user.findUnique({
      where: { phone: normalized },
    });
    if (!user) throw new UnauthorizedException("User not found");

    const otp = await this.prisma.otpCode.findFirst({
      where: { userId: user.id, usedAt: null, purpose: "login" },
      orderBy: { createdAt: "desc" },
    });
    if (!otp) throw new UnauthorizedException("Invalid code");
    if (dayjs(otp.expiresAt).isBefore(dayjs())) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { usedAt: new Date() },
      });
      throw new UnauthorizedException("Code expired");
    }

    const MAX_ATTEMPTS = 3;
    if (otp.attempts >= MAX_ATTEMPTS) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { usedAt: new Date() },
      });
      throw new UnauthorizedException("Too many attempts");
    }

    if (otp.code !== code) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException(
        `Invalid code. ${MAX_ATTEMPTS - (otp.attempts + 1)} attempts left`,
      );
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    });

    const sessionData = await this.issueSession(user, deviceInfo);
    if (referralCode) {
      await this.referralService.trackReferral(referralCode, user.id);
    }
    return sessionData;
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return { id: user.id, phone: user.phone, fullName: user.fullName ?? null };
  }

  /**
   * Find or create user by Telegram user info (from mini app initData)
   */
  async findOrCreateTelegramUser() {
    // Use telegramId as unique identifier
    // let user = await this.prisma.user.findFirst({
    //   where: { telegramId: telegramUser.id },
    // });
    // if (!user) {
    //   user = await this.prisma.user.create({
    //     data: {
    //       telegramId: telegramUser.id,
    //       fullName: [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(" ") || null,
    //       username: telegramUser.username || null,
    //       photoUrl: telegramUser.photo_url || null,
    //       isPremium: telegramUser.is_premium || false,
    //       languageCode: telegramUser.language_code || null,
    //     },
    //   });
    // }
    // return user;
  }

  // async verifyGoogle(
  //   credential: string,
  //   deviceInfo?: string,
  //   referralCode?: string,
  // ) {
  //   const clientId = process.env.GOOGLE_CLIENT_ID;
  //   if (!clientId) throw new BadRequestException("Missing GOOGLE_CLIENT_ID");
  //   const client = new OAuth2Client(clientId);
  //   const ticket = await client.verifyIdToken({
  //     idToken: credential,
  //     audience: clientId,
  //   });
  //   const payload = ticket.getPayload();
  //   if (!payload) throw new UnauthorizedException("Invalid Google credential");
  //   const { sub, email, name, email_verified } = payload;
  //   if (!email || email_verified === false)
  //     throw new UnauthorizedException("Email not verified");

  //   // Find or create user
  //   let user = await this.prisma.user.findFirst({
  //     where: { OR: [{ googleId: sub }, { email }] },
  //   });
  //   if (!user) {
  //     user = await this.prisma.user.create({
  //       data: { email, fullName: name || null, googleId: sub },
  //     });
  //   } else if (!user.googleId) {
  //     user = await this.prisma.user.update({
  //       where: { id: user.id },
  //       data: { googleId: sub, fullName: user.fullName || name || null },
  //     });
  //   }

  //   const sessionData = await this.issueSession(user, deviceInfo);
  //   if (referralCode) {
  //     await this.referralService.trackReferral(referralCode, user.id);
  //   }
  //   return sessionData;
  // }

  async refreshSession(refreshToken: string, deviceInfo?: string) {
    const hashed = this.hashRefreshToken(refreshToken);
    const session = await this.prisma.userSession.findUnique({
      where: { token: hashed },
    });
    if (!session || session.revokedAt)
      throw new UnauthorizedException("Invalid session");
    if (dayjs(session.expiresAt).isBefore(dayjs())) {
      await this.prisma.userSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException("Session expired");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
    });
    if (!user) throw new UnauthorizedException("User not found");

    return this.rotateSession(
      session.id,
      user,
      deviceInfo ?? session.deviceInfo ?? undefined,
    );
  }

  async logout(sessionId: number) {
    if (!sessionId) return { success: true };
    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) return { success: true };
    if (session.revokedAt) return { success: true };
    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: {
        revokedAt: new Date(),
        token: this.hashRefreshToken(this.generateRefreshToken()),
      },
    });
    return { success: true };
  }

  async createSessionForUser(userId: number, deviceInfo?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException("User not found");
    return this.issueSession(user, deviceInfo);
  }

  async verifyFirebaseOtp(
    idToken: string,
    deviceInfo?: string,
    referralCode?: string,
  ) {
    let rawPhone: string | null = null;
    function normalizePhone(raw: string): string {
      // faqat raqamlarni olamiz
      let digits = raw.replace(/\D/g, "");

      // agar +998 bilan kelgan bo‘lsa → 998...
      if (digits.startsWith("998")) {
        return `+${digits}`;
      }

      // agar 9 bilan boshlansa (xato holat)
      if (digits.startsWith("9")) {
        return `+998${digits.slice(1)}`;
      }

      throw new UnauthorizedException("Invalid phone format");
    }

    /* =========================
     FAKE / REAL FIREBASE TOKEN
     ========================= */
    if (idToken.startsWith("FAKE_FIREBASE_ID_TOKEN:")) {
      rawPhone = idToken.replace("FAKE_FIREBASE_ID_TOKEN:", "");
    } else {
      // const decoded = await auth.verifyIdToken(idToken);
      const decoded = { phone_number: null };
      rawPhone = decoded.phone_number ?? null;
    }

    if (!rawPhone) {
      throw new UnauthorizedException("Phone number not found");
    }

    /* =========================
     NORMALIZE PHONE
     ========================= */
    const phone = normalizePhone(rawPhone);

    /* =========================
     USER UPSERT
     ========================= */
    let user = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: { phone },
      });
    }

    /* =========================
     SESSION
     ========================= */
    const sessionData = await this.issueSession(user, deviceInfo);

    /* =========================
     REFERRAL
     ========================= */
    if (referralCode) {
      await this.referralService.trackReferral(referralCode, user.id);
    }

    return sessionData;
  }
}
