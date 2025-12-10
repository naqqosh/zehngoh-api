import { Injectable } from "@nestjs/common";
import { createHmac } from "crypto";
import type * as TelegramBot from "node-telegram-bot-api";
import { BotConfigService } from "./bot.config";
import {
  OrderBotFormatter,
  OrderBotItem,
  OrderBotMessageInput,
} from "./order-bot.formatter";
import { TelegramBotService } from "./telegram-bot.service";

export type OrderBotAction = "cancel" | "deliver" | "refresh";

export interface OrderBotNotificationInput
  extends Omit<
    OrderBotMessageInput,
    "subtotal" | "discount" | "total" | "items"
  > {
  subtotal: number;
  discount: number;
  total: number;
  items: OrderBotItem[];
}

@Injectable()
export class OrderBotGateway {
  private readonly formatter = new OrderBotFormatter();

  constructor(
    private readonly telegram: TelegramBotService,
    private readonly config: BotConfigService
  ) {}

  async notifyOrderCreated(input: OrderBotNotificationInput) {
    const cfg = this.config.get();
    const payload: OrderBotMessageInput = {
      orderId: input.orderId,
      createdAt: input.createdAt,
      customer: input.customer,
      paymentMethod: input.paymentMethod,
      deliverySlot: input.deliverySlot,
      subtotal: input.subtotal,
      discount: input.discount,
      total: input.total,
      items: input.items,
    };

    const message = this.formatter.formatOrderMessage(payload);

    const replyMarkup: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: [
        [
          {
            text: "🔄 Yangilash",
            callback_data: this.buildCallbackData("refresh", input.orderId),
          },
        ],
        [
          {
            text: "Bekor qilish",
            callback_data: this.buildCallbackData("cancel", input.orderId),
          },
          {
            text: "Yetkazib berildi",
            callback_data: this.buildCallbackData("deliver", input.orderId),
          },
        ],
      ],
    };

    await this.telegram.sendMessage(cfg.chatId, message.text, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: replyMarkup,
    });
  }

  validateCallbackData(
    data: string
  ): { action: OrderBotAction; orderId: number } | null {
    const [prefix, action, orderIdPart, signature] = data.split(":");
    if (
      prefix !== "order" ||
      (action !== "cancel" && action !== "deliver" && action !== "refresh")
    )
      return null;
    const orderId = Number(orderIdPart);
    if (!Number.isFinite(orderId)) return null;

    const cfg = this.config.get();
    if (cfg.actionSecret) {
      const expected = createHmac("sha256", cfg.actionSecret)
        .update(`order:${action}:${orderId}`)
        .digest("hex")
        .slice(0, 8);
      if (expected !== signature) return null;
    }

    return { action, orderId };
  }

  buildCallbackData(action: OrderBotAction, orderId: number): string {
    const base = `order:${action}:${orderId}`;
    const cfg = this.config.get();
    if (!cfg.actionSecret) return base;
    const signature = createHmac("sha256", cfg.actionSecret)
      .update(base)
      .digest("hex")
      .slice(0, 8);
    return `${base}:${signature}`;
  }

  formatStatusMessage(text: string, status: "cancelled" | "delivered"): string {
    return this.formatter.appendStatus(text, status);
  }

  async notifyNotFoundFeedback(input: {
    id: number;
    query: string;
    pageUrl?: string;
    userAgent?: string;
    ip?: string;
    userId?: number;
    createdAt: Date;
  }) {
    const cfg = this.config.get();
    const message = this.formatNotFoundFeedbackMessage(input);

    await this.telegram.sendMessage(cfg.chatId, message, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  }

  private formatNotFoundFeedbackMessage(input: {
    id: number;
    query: string;
    pageUrl?: string;
    userAgent?: string;
    ip?: string;
    userId?: number;
    createdAt: Date;
  }): string {
    const timestamp = input.createdAt.toLocaleString("uz-UZ", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const userInfo = input.userId
      ? `👤 User ID: ${input.userId}`
      : `📍 IP: ${input.ip || "noma'lum"}`;

    const lines = [
      "❌ <b>Tovar Topilmadi - Feedback</b>",
      `🕐 ${timestamp}`,
      "",
      `🔍 <b>Qidiruv:</b> <code>${this.escapeHtml(input.query)}</code>`,
    ];

    if (input.pageUrl) {
      lines.push(
        `📄 <b>Sahifa:</b> <a href="${this.escapeHtml(input.pageUrl)}">link</a>`
      );
    }

    lines.push("");
    lines.push(userInfo);

    if (input.userAgent) {
      const ua =
        input.userAgent.length > 100
          ? `${input.userAgent.substring(0, 100)}...`
          : input.userAgent;
      lines.push(`🖥️ <b>Device:</b> <code>${this.escapeHtml(ua)}</code>`);
    }

    return lines.join("\n");
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}
