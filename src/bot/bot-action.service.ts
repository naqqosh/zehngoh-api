import { Injectable, Logger } from "@nestjs/common";
import { CallbackQuery } from "node-telegram-bot-api";
import { Prisma } from "shared-db";
import { PrismaService } from "../prisma/prisma.service";
import { OrderBotGateway } from "./order-bot.gateway";
import { TelegramBotService } from "./telegram-bot.service";

@Injectable()
export class BotActionService {
  private readonly logger = new Logger(BotActionService.name);
  private readonly processedCallbacks = new Set<string>();

  constructor(
    private readonly orderBotGateway: OrderBotGateway,
    private readonly telegram: TelegramBotService,
    private readonly prisma: PrismaService,
  ) {
    this.telegram.registerCallbackHandler((callback) => this.handleCallback(callback));
  }

  async handleCallback(callback: CallbackQuery) {
    if (!callback.data || !callback.id) return;

    const message = callback.message;
    if (!message) {
      await this.telegram.answerCallbackQuery(callback.id, "Amalni bajarib bo'lmadi", true);
      return;
    }

    const action = this.orderBotGateway.validateCallbackData(callback.data);
    if (!action) {
      await this.telegram.answerCallbackQuery(callback.id, "Xato: amal tanib bo'lmadi", true);
      return;
    }

    if (this.isAlreadyProcessed(callback.id)) {
      await this.telegram.answerCallbackQuery(callback.id, "Allaqachon bajarilgan");
      return;
    }

    // Prevent repeated actions by checking message badge
    const currentText = message.text ?? "";
    if (action.action === "cancel" && currentText.includes("⛔ Bekor qilingan")) {
      await this.telegram.answerCallbackQuery(callback.id, "Bu buyurtma allaqachon bekor qilingan");
      return;
    }
    if (action.action === "deliver" && currentText.includes("✅ Yetkazib berildi")) {
      await this.telegram.answerCallbackQuery(callback.id, "Bu buyurtma allaqachon yetkazib berilgan");
      return;
    }

    try {
      if (action.action === "cancel") {
        await this.cancelOrder(action.orderId);
        const updated = this.orderBotGateway.formatStatusMessage(currentText, "cancelled");
        await this.telegram.editMessageText(message.chat.id, message.message_id, updated, {
          parse_mode: "HTML",
          disable_web_page_preview: true,
          reply_markup: { inline_keyboard: [] },
        });
        await this.telegram.answerCallbackQuery(callback.id, "Buyurtma bekor qilindi");
      } else {
        await this.markDelivered(action.orderId);
        const updated = this.orderBotGateway.formatStatusMessage(currentText, "delivered");
        await this.telegram.editMessageText(message.chat.id, message.message_id, updated, {
          parse_mode: "HTML",
          disable_web_page_preview: true,
          reply_markup: { inline_keyboard: [] },
        });
        await this.telegram.answerCallbackQuery(callback.id, "Buyurtma yetkazib berildi sifatida belgilandi");
      }
    } catch (err) {
      this.logger.error(`Failed to handle bot action ${action.action} for order ${action.orderId}`, err as Error);
      await this.telegram.answerCallbackQuery(callback.id, "Amal bajarilmadi. Qayta urinib ko'ring.", true);
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
      throw new Error(`Cannot cancel order ${orderId} with status ${order.status}`);
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
      throw new Error(`Cannot mark order ${orderId} as delivered because it is cancelled`);
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

  private deliveryMutation(deliveredAt: Date): Prisma.DeliveryUpdateOneWithoutOrderNestedInput {
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
}
