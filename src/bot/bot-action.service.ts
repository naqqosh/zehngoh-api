import { Injectable, Logger } from "@nestjs/common";
import { CallbackQuery } from "node-telegram-bot-api";
import type * as TelegramBot from "node-telegram-bot-api";
import { Prisma } from "shared-db";
import { PrismaService } from "../prisma/prisma.service";
import { OrderBotGateway } from "./order-bot.gateway";
import { OrderBotFormatter } from "./order-bot.formatter";
import { TelegramBotService } from "./telegram-bot.service";

@Injectable()
export class BotActionService {
  private readonly logger = new Logger(BotActionService.name);
  private readonly processedCallbacks = new Set<string>();

  constructor(
    private readonly orderBotGateway: OrderBotGateway,
    private readonly telegram: TelegramBotService,
    private readonly prisma: PrismaService
  ) {
    this.telegram.registerCallbackHandler((callback) =>
      this.handleCallback(callback)
    );
  }

  async handleCallback(callback: CallbackQuery) {
    if (!callback.data || !callback.id) return;

    const message = callback.message;
    if (!message) {
      await this.telegram.answerCallbackQuery(
        callback.id,
        "Amalni bajarib bo'lmadi",
        true
      );
      return;
    }

    const action = this.orderBotGateway.validateCallbackData(callback.data);
    if (!action) {
      await this.telegram.answerCallbackQuery(
        callback.id,
        "Xato: amal tanib bo'lmadi",
        true
      );
      return;
    }

    if (this.isAlreadyProcessed(callback.id)) {
      await this.telegram.answerCallbackQuery(
        callback.id,
        "Allaqachon bajarilgan"
      );
      return;
    }

    // Prevent repeated actions by checking message badge
    const currentText = message.text ?? "";
    if (
      action.action === "cancel" &&
      currentText.includes("⛔ Bekor qilingan")
    ) {
      await this.telegram.answerCallbackQuery(
        callback.id,
        "Bu buyurtma allaqachon bekor qilingan"
      );
      return;
    }
    if (
      action.action === "deliver" &&
      currentText.includes("✅ Yetkazib berildi")
    ) {
      await this.telegram.answerCallbackQuery(
        callback.id,
        "Bu buyurtma allaqachon yetkazib berilgan"
      );
      return;
    }

    try {
      if (action.action === "cancel") {
        await this.cancelOrder(action.orderId);
        const updated = this.orderBotGateway.formatStatusMessage(
          currentText,
          "cancelled"
        );
        await this.telegram.editMessageText(
          message.chat.id,
          message.message_id,
          updated,
          {
            parse_mode: "HTML",
            disable_web_page_preview: true,
            reply_markup: { inline_keyboard: [] },
          }
        );
        await this.telegram.answerCallbackQuery(
          callback.id,
          "Buyurtma bekor qilindi"
        );
      } else if (action.action === "deliver") {
        await this.markDelivered(action.orderId);
        const updated = this.orderBotGateway.formatStatusMessage(
          currentText,
          "delivered"
        );
        await this.telegram.editMessageText(
          message.chat.id,
          message.message_id,
          updated,
          {
            parse_mode: "HTML",
            disable_web_page_preview: true,
            reply_markup: { inline_keyboard: [] },
          }
        );
        await this.telegram.answerCallbackQuery(
          callback.id,
          "Buyurtma yetkazib berildi sifatida belgilandi"
        );
      } else if (action.action === "refresh") {
        await this.refreshOrderStatus(
          action.orderId,
          message.chat.id,
          message.message_id,
          currentText,
          callback.id
        );
      }
    } catch (err) {
      this.logger.error(
        `Failed to handle bot action ${action.action} for order ${action.orderId}`,
        err as Error
      );
      await this.telegram.answerCallbackQuery(
        callback.id,
        "Amal bajarilmadi. Qayta urinib ko'ring.",
        true
      );
    } finally {
      this.trimProcessedCache();
    }
  }

  private async cancelOrder(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    });
    if (!order) throw new Error("Order not found");
    if (order.status === "cancelled") return;
    if (order.status !== "pending") {
      throw new Error(
        `Cannot cancel order ${orderId} with status ${order.status}`
      );
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: "cancelled", updatedAt: new Date() },
    });
  }

  private async markDelivered(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        delivery: { select: { id: true } },
      },
    });

    if (!order) throw new Error("Order not found");
    if (order.status === "delivered") return;
    if (order.status === "cancelled") {
      throw new Error(
        `Cannot mark order ${orderId} as delivered because it is cancelled`
      );
    }

    const deliveredAt = new Date();

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: "delivered",
        updatedAt: deliveredAt,
        delivery: this.deliveryMutation(deliveredAt),
      },
    });
  }

  private deliveryMutation(
    deliveredAt: Date
  ): Prisma.DeliveryUpdateOneWithoutOrderNestedInput {
    return {
      upsert: {
        update: {
          status: "delivered",
          deliveredAt,
        },
        create: {
          status: "delivered",
          deliveredAt,
        },
      },
    };
  }

  private isAlreadyProcessed(callbackId: string): boolean {
    if (this.processedCallbacks.has(callbackId)) return true;
    this.processedCallbacks.add(callbackId);
    return false;
  }

  private trimProcessedCache() {
    if (this.processedCallbacks.size > 1000) {
      this.processedCallbacks.clear();
    }
  }

  private async refreshOrderStatus(
    orderId: number,
    chatId: number,
    messageId: number,
    currentText: string,
    callbackId: string
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Build updated message with current status badge
    // Keep the original text with product links intact
    const formatter = new OrderBotFormatter();
    const updatedText = formatter.syncStatusBadge(currentText, order.status);

    // Build keyboard based on current order status
    const keyboard = this.buildActionKeyboard(orderId, order.status);

    // Edit the message with updated status and buttons
    // Ensure HTML parsing is enabled to preserve links
    await this.telegram.editMessageText(chatId, messageId, updatedText, {
      parse_mode: "HTML",
      disable_web_page_preview: false,
      reply_markup: keyboard,
    });

    // Provide feedback based on status
    let feedbackMessage = "Buyurtma yangilandi";
    if (order.status === "delivered") {
      feedbackMessage = "✅ Buyurtma yetkazib berilgan";
    } else if (order.status === "cancelled") {
      feedbackMessage = "⛔ Buyurtma bekor qilingan";
    }

    await this.telegram.answerCallbackQuery(callbackId, feedbackMessage);
  }

  private buildActionKeyboard(
    orderId: number,
    status: string
  ): TelegramBot.InlineKeyboardMarkup {
    // If order is already cancelled or delivered, remove buttons
    if (status === "cancelled" || status === "delivered") {
      return { inline_keyboard: [] };
    }

    // For pending orders, show all action buttons
    return {
      inline_keyboard: [
        [
          {
            text: "🔄 Yangilash",
            callback_data: this.orderBotGateway.buildCallbackData(
              "refresh",
              orderId
            ),
          },
        ],
        [
          {
            text: "Bekor qilish",
            callback_data: this.orderBotGateway.buildCallbackData(
              "cancel",
              orderId
            ),
          },
          {
            text: "Yetkazib berildi",
            callback_data: this.orderBotGateway.buildCallbackData(
              "deliver",
              orderId
            ),
          },
        ],
      ],
    };
  }
}
