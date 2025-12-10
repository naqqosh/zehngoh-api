import { Module } from "@nestjs/common";
import { FeedbackController } from "./feedback.controller";
import { FeedbackService } from "./feedback.service";
import { PrismaModule } from "../prisma/prisma.module";
import { BotModule } from "../bot/bot.module";

@Module({
  imports: [PrismaModule, BotModule],
  controllers: [FeedbackController],
  providers: [FeedbackService],
})
export class FeedbackModule {}
