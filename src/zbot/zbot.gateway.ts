import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ZBotFlowService } from "./zbot-flow.service";
import TelegramBot from "node-telegram-bot-api";

@Injectable()
export class ZBotGateway implements OnModuleInit {
  private bot!: TelegramBot;
  private readonly logger = new Logger(ZBotGateway.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly zbotFlowService: ZBotFlowService,
  ) {}

  onModuleInit() {
    const token = this.configService.get<string>("TELEGRAM_ZEHNGOH_BOT_TOKEN");
    if (!token) {
      this.logger.error("TELEGRAM_ZEHNGOH_BOT_TOKEN is not set");
      return;
    }
    this.bot = new TelegramBot(token, { polling: true });
    this.logger.log("Telegram bot started (polling mode)");

    this.bot.on("callback_query", async (query: TelegramBot.CallbackQuery) => {
      try {
        await this.zbotFlowService.handleUpdate(this.bot, query);
      } catch (error) {
        this.logger.error(
          "Error in callback_query handler",
          error instanceof Error ? error.stack : String(error),
        );
      }
    });

    this.bot.on("contact", async (msg: TelegramBot.Message) => {
      try {
        await this.zbotFlowService.handleUpdate(this.bot, msg);
      } catch (error) {
        this.logger.error(
          "Error in contact handler",
          error instanceof Error ? error.stack : String(error),
        );
      }
    });

    this.bot.on("text", async (msg: TelegramBot.Message) => {
      try {
        await this.zbotFlowService.handleUpdate(this.bot, msg);
      } catch (error) {
        this.logger.error(
          "Error in contact handler",
          error instanceof Error ? error.stack : String(error),
        );
      }
    });
  }
}
