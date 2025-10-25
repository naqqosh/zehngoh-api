import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type BotMode = "polling" | "webhook";

export interface BotWebhookConfig {
  url: string;
  secretToken: string;
}

export interface BotConfig {
  mode: BotMode;
  token: string;
  chatId: string;
  webhook?: BotWebhookConfig;
  actionSecret?: string;
}

@Injectable()
export class BotConfigService {
  private readonly logger = new Logger(BotConfigService.name);
  private readonly config: BotConfig;

  constructor(private readonly configService: ConfigService) {
    const nodeEnv = (this.configService.get<string>("NODE_ENV") ?? "development").toLowerCase();

    const prodToken = this.configService.get<string>("TELEGRAM_BOT_TOKEN");
    const devToken = this.configService.get<string>("TELEGRAM_BOT_TOKEN_DEV");
    const token = nodeEnv === "production" || !devToken ? prodToken : devToken;
    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN is not configured");
    }

    const prodChatId = this.configService.get<string>("TELEGRAM_ADMIN_CHAT_ID");
    const devChatId = this.configService.get<string>("TELEGRAM_ADMIN_CHAT_ID_DEV");
    const chatId = nodeEnv === "production" || !devChatId ? prodChatId : devChatId;
    if (!chatId) {
      throw new Error("TELEGRAM_ADMIN_CHAT_ID is not configured");
    }

    const modeValue = (this.configService.get<string>("TELEGRAM_BOT_MODE") ?? "polling").toLowerCase();
    const mode = modeValue === "webhook" ? "webhook" : "polling";

    const webhookUrl = this.configService.get<string>("TELEGRAM_BOT_WEBHOOK_URL");
    const secretToken =
      this.configService.get<string>("TELEGRAM_BOT_SECRET_TOKEN") ??
      this.configService.get<string>("TELEGRAM_BOT_WEBHOOK_SECRET");

    if (mode === "webhook") {
      if (!webhookUrl) {
        throw new Error("TELEGRAM_BOT_WEBHOOK_URL is required in webhook mode");
      }
      if (!secretToken) {
        throw new Error("TELEGRAM_BOT_SECRET_TOKEN is required in webhook mode");
      }
    }

    const actionSecret = this.configService.get<string>("TELEGRAM_BOT_ACTION_SECRET") ?? secretToken;
    if (!actionSecret) {
      this.logger.warn("TELEGRAM_BOT_ACTION_SECRET is not set; bot callbacks will not be signed");
    }

    this.config = {
      token,
      chatId,
      mode,
      webhook: mode === "webhook" ? { url: webhookUrl!, secretToken: secretToken! } : undefined,
      actionSecret,
    };
  }

  get(): BotConfig {
    return this.config;
  }
}
