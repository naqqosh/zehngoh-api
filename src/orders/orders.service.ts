import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { OrderBotGateway } from "../bot/order-bot.gateway";
import { DateTime } from "luxon";

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private readonly orderBotGateway: OrderBotGateway,
  ) {}

  async list(userId: number) {
    const orders = await this.prisma.order.findMany({
      where: { userId, status: "pending" },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });
    return orders.map((o: any) => ({
      id: o.id,
      status: o.status,
      paymentMethod: o.paymentMethod,
      totalAmountUzs: o.totalAmountUzs.toString(),
      itemsCount: o.items.length,
      createdAt: o.createdAt,
    }));
  }

  async get(userId: number, id: number) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      select: {
        id: true,
        status: true,
        totalAmountUzs: true,
        shipToName: true,
        shipPhone: true,
        createdAt: true,
        items: {
          select: {
            productId: true,
            quantity: true,
            unitPriceUzs: true,
            totalPriceUzs: true,

            product: {
              select: {
                images: {
                  where: {
                    position: 0,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) throw new NotFoundException("Order not found");

    return {
      id: order.id,
      status: order.status,
      totalAmountUzs: order.totalAmountUzs.toString(),
      items: order.items.map((i: any) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPriceUzs: i.unitPriceUzs.toString(),
        totalPriceUzs: i.totalPriceUzs.toString(),
        image: i.product?.images[0]?.imageUrl,
      })),
      shipToName: order.shipToName,
      shipPhone: order.shipPhone,
      // address: {
      //   line1: order.shipAddress1,
      //   line2: order.shipAddress2,
      //   city: order.shipCity,
      //   region: order.shipRegion,
      //   postal: order.shipPostal,
      // },
      createdAt: order.createdAt,
    };
  }

  async create(userId: number, dto: CreateOrderDto) {
    // Fetch products and compute totals
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    if (products.length !== productIds.length)
      throw new BadRequestException("Some products not found");

    const itemsData = dto.items.map((i) => {
      const p = products.find((pp: any) => pp.id === i.productId)!;
      const unit = Number(p.priceUzs);
      const total = unit * i.quantity;
      return {
        productId: i.productId,
        quantity: i.quantity,
        unitPriceUzs: unit,
        totalPriceUzs: total,
        variantId: i.variantId,
      };
    });
    const subtotal = itemsData.reduce((s, i) => s + i.totalPriceUzs, 0);

    // TODO: promo validation if provided
    // let promoId: number | undefined;
    let discount = 0;
    // if (dto.promoCode) {
    //   const promo = await this.prisma.promoCode.findFirst({
    //     where: { code: dto.promoCode, isActive: true },
    //   })
    //   if (promo) {
    //     promoId = promo.id
    //     if (promo.type === 'fixed') discount = Number(promo.value)
    //     if (promo.type === 'percent') discount = Math.floor((Number(promo.value) * subtotal) / 100)
    //   }
    // }
    const FREE_SHIPPING_THRESHOLD = 50000;
    const now = DateTime.now().setZone("Asia/Tashkent");
    const start = now.set({ hour: 8, minute: 30, second: 0 });
    const end = now.set({ hour: 17, minute: 0, second: 0 });

    const isWorkingTime = now >= start && now <= end;

    const deliveryFee =
      subtotal - discount >= FREE_SHIPPING_THRESHOLD
        ? 0
        : isWorkingTime
          ? 4000
          : 5000;

    const total = Math.max(0, subtotal - discount + deliveryFee);

    const order = await this.prisma.order.create({
      data: {
        userId,
        status: "pending",
        paymentMethod: dto.paymentMethod,
        shipToName: dto.customerInfo.name,
        shipPhone: dto.customerInfo.phone,
        shipAddress1: "", // dto.deliveryAddress.street,
        // shipAddress2: dto.deliveryAddress.landmark ?? null,
        shipCity: "", //dto.deliveryAddress.city,
        shipRegion: "", // dto.deliveryAddress.district ?? null,
        subtotalUzs: subtotal,
        discountTotalUzs: discount,
        deliveryFeeUzs: deliveryFee,
        totalAmountUzs: total,
        // promoId,
        items: { createMany: { data: itemsData } },
      },
    });

    // Clear active cart after order
    const cart = await this.prisma.cart.findFirst({
      where: { userId, status: "active" },
    });
    if (cart)
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    void this.dispatchOrderNotification({
      userId,
      order,
      items: itemsData,
      products,
      dto,
      subtotal,
      discount,
      total,
    });

    return { orderId: order.id };
  }

  async cancel(userId: number, id: number) {
    const order = await this.prisma.order.findFirst({ where: { id, userId } });
    if (!order) throw new NotFoundException("Order not found");
    if (order.status !== "pending")
      throw new BadRequestException("Only pending orders can be cancelled");
    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: "cancelled" },
    });
  }

  async syncOrderStatus(userId: number, id: number) {
    const order = await this.prisma.order.findFirst({ where: { id, userId } });
    if (!order) throw new NotFoundException("Order not found");
    return order.status;
  }

  private async dispatchOrderNotification(params: {
    userId: number;
    order: any;
    items: Array<{
      productId: number;
      quantity: number;
      unitPriceUzs: number;
      totalPriceUzs: number;
    }>;
    products: Array<{
      id: number;
      nameUz?: string | null;
      nameRu?: string | null;
    }>;
    dto: CreateOrderDto;
    subtotal: number;
    discount: number;
    total: number;
  }) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: params.userId },
        select: { fullName: true },
      });
      const userName = user?.fullName || null;

      const items = params.items.map((item) => {
        const product = params.products.find(
          (p: any) => p.id === item.productId,
        );
        const name =
          product?.nameUz ?? product?.nameRu ?? `Mahsulot #${item.productId}`;
        return {
          productId: item.productId,
          name,
          quantity: item.quantity,
          totalPrice: item.totalPriceUzs,
        };
      });

      await this.orderBotGateway.notifyOrderCreated({
        orderId: params.order.id,
        createdAt: params.order.createdAt,
        customer: {
          name: params.dto.customerInfo.name,
          phone: params.dto.customerInfo.phone,
          notes: params.dto.customerInfo.notes,
        },
        userName,
        paymentMethod: params.dto.paymentMethod,
        deliverySlot: undefined,
        subtotal: params.subtotal,
        discount: params.discount,
        total: params.total,
        items,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Failed to notify Telegram bot about order #${params.order.id}: ${message}`,
      );
    }
  }
}
