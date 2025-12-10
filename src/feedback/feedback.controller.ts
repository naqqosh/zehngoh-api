import { Body, Controller, HttpCode, Post, Req, Logger } from "@nestjs/common";
import { FeedbackService } from "./feedback.service";
import { CreateNotFoundDto } from "./dto/create-not-found.dto";
import type { Request } from "express";
import { JwtService } from "@nestjs/jwt";
import { OrderBotGateway } from "../bot/order-bot.gateway";

@Controller("feedback")
export class FeedbackController {
  private readonly logger = new Logger(FeedbackController.name);

  constructor(
    private service: FeedbackService,
    private jwt: JwtService,
    private botGateway: OrderBotGateway
  ) {}

  @Post("not-found")
  @HttpCode(201)
  async notFound(@Body() dto: CreateNotFoundDto, @Req() req: Request) {
    const userAgent = (req.headers["user-agent"] as string) || undefined;
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip;
    let userId: number | undefined;
    const auth = (req.headers["authorization"] as string) || "";
    if (auth.startsWith("Bearer ")) {
      const token = auth.slice(7);
      try {
        const payload: any = await this.jwt.verifyAsync(token, {
          secret: process.env.JWT_SECRET || "dev_secret",
        });
        if (payload?.id && typeof payload.id === "number") userId = payload.id;
      } catch {}
    }

    const feedback = await this.service.createNotFound({
      query: dto.query.trim(),
      pageUrl: dto.pageUrl,
      userAgent,
      ip,
      userId,
    });

    // Send notification to Telegram bot
    try {
      await this.botGateway.notifyNotFoundFeedback({
        id: feedback.id,
        query: feedback.query,
        pageUrl: feedback.pageUrl || undefined,
        userAgent: feedback.userAgent || undefined,
        ip: feedback.ip || undefined,
        userId: feedback.userId || undefined,
        createdAt: feedback.createdAt,
      });
    } catch (err) {
      this.logger.error(
        `Failed to notify bot about not-found feedback: ${err instanceof Error ? err.message : String(err)}`
      );
      // Don't throw, just log. User still gets success response
    }

    return { ok: true };
  }
}
