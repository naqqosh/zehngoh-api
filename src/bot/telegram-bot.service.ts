import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import TelegramBot = require("node-telegram-bot-api");
import type {
  CallbackQuery,
  EditMessageTextOptions,
  Message,
  SendMessageOptions,
  Update,
} from "node-telegram-bot-api";
import { BotConfigService, BotWebhookConfig } from "./bot.config";

@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot?: TelegramBot;
  private callbackHandler?: (callback: CallbackQuery) => Promise<void>;

  constructor(private readonly configService: BotConfigService) {}

  async onModuleInit() {
    const config = this.configService.get();
    this.bot = new TelegramBot(config.token, {
      polling: config.mode === "polling",
    });

    this.bot.on("callback_query", (callbackQuery) => {
      if (!this.callbackHandler) return;
      void this.safeHandleCallback(callbackQuery);
    });

    if (config.mode === "webhook" && config.webhook) {
      await this.ensureWebhook(config.webhook);
    }

    this.logger.log(`Telegram bot initialized in ${config.mode} mode`);
  }

  async onModuleDestroy() {
    if (this.bot && (this.bot as any).isPolling?.()) {
      try {
        await this.bot.stopPolling();
        this.logger.log("Telegram polling stopped");
      } catch (err) {
        this.logger.error("Failed to stop Telegram polling", err as Error);
      }
    }
  }

  registerCallbackHandler(handler: (callback: CallbackQuery) => Promise<void>) {
    this.callbackHandler = handler;
  }

  async processUpdate(update: Update) {
    if (!this.bot) {
      this.logger.warn("Telegram bot instance not ready to process updates");
      return;
    }
    try {
      await this.bot.processUpdate(update);
    } catch (err) {
      this.logger.error("Failed to process Telegram update", err as Error);
    }
  }

  async sendMessage(chatId: number | string, text: string, options: SendMessageOptions): Promise<Message | undefined> {
    if (!this.bot) {
      this.logger.warn("Telegram bot instance not ready to send messages");
      return undefined;
    }
    try {
      return await this.bot.sendMessage(chatId, text, options);
    } catch (err) {
      this.logger.error(`Failed to send Telegram message to chat ${chatId}`, err as Error);
      throw err;
    }
  }

  async editMessageText(
    chatId: number | string,
    messageId: number,
    text: string,
    options: EditMessageTextOptions,
  ): Promise<boolean> {
    if (!this.bot) {
      this.logger.warn("Telegram bot instance not ready to edit messages");
      return false;
    }
    try {
      await this.bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        ...options,
      });
      return true;
    } catch (err) {
      this.logger.error(`Failed to edit Telegram message ${messageId} in chat ${chatId}`, err as Error);
      return false;
    }
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string, showAlert = false) {
    if (!this.bot) {
      this.logger.warn("Telegram bot instance not ready to answer callback queries");
      return;
    }
    try {
      await this.bot.answerCallbackQuery(callbackQueryId, { text, show_alert: showAlert });
    } catch (err) {
      this.logger.error(`Failed to answer callback query ${callbackQueryId}`, err as Error);
    }
  }

  private async ensureWebhook(webhook: BotWebhookConfig) {
    if (!this.bot) return;
    try {
      await this.bot.setWebHook(webhook.url, { secret_token: webhook.secretToken });
      this.logger.log(`Telegram webhook set to ${webhook.url}`);
    } catch (err) {
      this.logger.error("Failed to set Telegram webhook", err as Error);
      throw err;
    }
  }

  private async safeHandleCallback(callbackQuery: CallbackQuery) {
    if (!this.callbackHandler) return;
    try {
      await this.callbackHandler(callbackQuery);
    } catch (err) {
      this.logger.error("Callback handler execution failed", err as Error);
    }
  }
}
