import * as dayjs from "dayjs";

const NUMBER_FORMAT = new Intl.NumberFormat("uz-UZ");

export interface OrderBotItem {
  productId: number;
  name: string;
  quantity: number;
  totalPrice: number;
}

export interface OrderBotMessageInput {
  orderId: number;
  createdAt: Date;
  customer: { name: string; phone: string; notes?: string | null };
  userName?: string | null;
  paymentMethod: string;
  deliverySlot?: string | null;
  subtotal: number;
  discount: number;
  total: number;
  items: OrderBotItem[];
}

export interface OrderBotMessage {
  text: string;
}

export class OrderBotFormatter {
  truncateName(name: string): string {
    if (!name) return "";
    return name.length > 18 ? `${name.slice(0, 18)}…` : name;
  }

  escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  formatPrice(amount: number): string {
    return `${NUMBER_FORMAT.format(amount)} so'm`;
  }

  buildItemLine(item: OrderBotItem): string {
    const shortName = this.escapeHtml(this.truncateName(item.name));
    const price = this.formatPrice(item.totalPrice);
    return `• <a href="https://zehngoh.uz/product/${item.productId}">${shortName}</a> ×${item.quantity} ta — ${price}`;
  }

  formatOrderMessage(input: OrderBotMessageInput): OrderBotMessage {
    const created = dayjs(input.createdAt).format("YYYY-MM-DD HH:mm");
    const customerNotes = input.customer.notes?.trim() || "—";
    const deliverySlot = input.deliverySlot?.trim() || "mavjud emas";
    const discountLine =
      input.discount > 0 ? ` (-${this.formatPrice(input.discount)} promo)` : "";

    const header = [
      `🆕 Yangi buyurtma #${input.orderId}`,
      `👤 ${this.escapeHtml(input.customer.name)} (${this.escapeHtml(input.customer.phone.replace(/\s/g, ""))})`,
      ...(input.userName
        ? [`👤 Buyurtmachi: ${this.escapeHtml(input.userName)}`]
        : []),
      `🕒 ${created}`,
      "",
      "📦 Buyurtma:",
    ];

    const items = input.items.map((item) => this.buildItemLine(item));
    const paymentBlock = [
      "",
      `💰 Jami: ${this.formatPrice(input.total)}${discountLine}`,
      `💳 To'lov: ${this.escapeHtml(input.paymentMethod)}`,
      `🗓️ Yetkazib berish: ${this.escapeHtml(deliverySlot)}`,
      `💬 Izoh: ${this.escapeHtml(customerNotes)}`,
    ];

    const text = [...header, ...items, ...paymentBlock].join("\n");
    return { text };
  }

  appendStatus(text: string, status: "cancelled" | "delivered"): string {
    const statusBadge =
      status === "delivered" ? "✅ Yetkazib berildi" : "⛔ Bekor qilingan";
    if (text.includes(statusBadge)) return text;
    return `${text}\n\n${statusBadge}`;
  }

  syncStatusBadge(text: string, currentStatus: string): string {
    // Remove any existing status badges more robustly
    let cleanText = text
      .replace(/\n\n✅ Yetkazib berildi\s*$/, "")
      .replace(/\n\n⛔ Bekor qilingan\s*$/, "")
      .trim();

    // Add new badge if status requires one
    if (currentStatus === "delivered") {
      if (cleanText.includes("✅ Yetkazib berildi")) {
        return cleanText;
      }
      return `${cleanText}\n\n✅ Yetkazib berildi`;
    }
    if (currentStatus === "cancelled") {
      if (cleanText.includes("⛔ Bekor qilingan")) {
        return cleanText;
      }
      return `${cleanText}\n\n⛔ Bekor qilingan`;
    }

    // For pending status, just return the clean text (no badge)
    return cleanText;
  }
}
