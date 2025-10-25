import { Body, Controller, ForbiddenException, Headers, Post } from "@nestjs/common";
import { Update } from "node-telegram-bot-api";
import { BotConfigService } from "./bot.config";
import { TelegramBotService } from "./telegram-bot.service";

@Controller("internal/bot")
export class BotWebhookController {
  constructor(
    private readonly config: BotConfigService,
    private readonly telegram: TelegramBotService,
  ) {}

  @Post("update")
  async handleUpdate(
    @Headers("x-telegram-bot-api-secret-token") secretToken: string | undefined,
    @Body() update: Update,
  ) {
    const cfg = this.config.get();

    if (cfg.mode === "webhook" && cfg.webhook?.secretToken) {
      if (!secretToken || secretToken !== cfg.webhook.secretToken) {
        throw new ForbiddenException("Invalid Telegram secret token");
      }
    }

    await this.telegram.processUpdate(update);
    return { ok: true };
  }
}
