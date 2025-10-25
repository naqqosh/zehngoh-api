import { Injectable } from "@nestjs/common";
import { createHmac } from "crypto";
import type * as TelegramBot from "node-telegram-bot-api";
import { BotConfigService } from "./bot.config";
import { OrderBotFormatter, OrderBotItem, OrderBotMessageInput } from "./order-bot.formatter";
import { TelegramBotService } from "./telegram-bot.service";

export type OrderBotAction = "cancel" | "deliver";

export interface OrderBotNotificationInput extends Omit<OrderBotMessageInput, "subtotal" | "discount" | "total" | "items"> {
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
    private readonly config: BotConfigService,
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
          { text: "Bekor qilish", callback_data: this.buildCallbackData("cancel", input.orderId) },
          { text: "Yetkazib berildi", callback_data: this.buildCallbackData("deliver", input.orderId) },
        ],
      ],
    };

    await this.telegram.sendMessage(cfg.chatId, message.text, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: replyMarkup,
    });
  }

  validateCallbackData(data: string): { action: OrderBotAction; orderId: number } | null {
    const [prefix, action, orderIdPart, signature] = data.split(":");
    if (prefix !== "order" || (action !== "cancel" && action !== "deliver")) return null;
    const orderId = Number(orderIdPart);
    if (!Number.isFinite(orderId)) return null;

    const cfg = this.config.get();
    if (cfg.actionSecret) {
      const expected = createHmac("sha256", cfg.actionSecret).update(`order:${action}:${orderId}`).digest("hex").slice(0, 8);
      if (expected !== signature) return null;
    }

    return { action, orderId };
  }

  buildCallbackData(action: OrderBotAction, orderId: number): string {
    const base = `order:${action}:${orderId}`;
    const cfg = this.config.get();
    if (!cfg.actionSecret) return base;
    const signature = createHmac("sha256", cfg.actionSecret).update(base).digest("hex").slice(0, 8);
    return `${base}:${signature}`;
  }

  formatStatusMessage(text: string, status: "cancelled" | "delivered"): string {
    return this.formatter.appendStatus(text, status);
  }
}
