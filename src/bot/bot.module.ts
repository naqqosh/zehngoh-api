import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { BotActionService } from "./bot-action.service";
import { BotConfigService } from "./bot.config";
import { OrderBotGateway } from "./order-bot.gateway";
import { BotWebhookController } from "./bot-webhook.controller";
import { TelegramBotService } from "./telegram-bot.service";

@Module({
  imports: [PrismaModule],
  controllers: [BotWebhookController],
  providers: [BotConfigService, TelegramBotService, OrderBotGateway, BotActionService],
  exports: [OrderBotGateway],
})
export class BotModule {}
