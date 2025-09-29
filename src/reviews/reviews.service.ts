import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "shared-db";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOrderItemReviewDto, ReviewImageInputDto } from "./dto/create-order-item-review.dto";

const REVIEWABLE_ORDER_STATUSES = ["delivered", "completed"];

const productSelect = Prisma.validator<Prisma.ProductSelect>()({
  id: true,
  nameUz: true,
  nameRu: true,
  images: {
    orderBy: { position: "asc" },
    take: 1,
    select: { imageUrl: true },
  },
  category: {
    select: {
      nameUz: true,
      nameRu: true,
      parent: {
        select: {
          nameUz: true,
          nameRu: true,
        },
      },
    },
  },
});

const orderSelect = Prisma.validator<Prisma.OrderSelect>()({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  delivery: {
    select: {
      status: true,
      deliveredAt: true,
    },
  },
});

const orderItemListInclude = Prisma.validator<Prisma.OrderItemInclude>()({
  order: { select: orderSelect },
  product: { select: productSelect },
  review: { select: { id: true } },
});

const orderItemWithReviewInclude = Prisma.validator<Prisma.OrderItemInclude>()({
  order: { select: orderSelect },
  product: { select: productSelect },
  review: {
    include: {
      images: {
        orderBy: { position: "asc" },
      },
    },
  },
});

type OrderItemListPayload = Prisma.OrderItemGetPayload<{ include: typeof orderItemListInclude }>;

type OrderItemWithReviewPayload = Prisma.OrderItemGetPayload<{ include: typeof orderItemWithReviewInclude }>;

type PreparedReviewImage = { fileId: number | null; imageUrl: string | null };

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async listEligible(userId: number) {
    const items = await this.prisma.orderItem.findMany({
      where: {
        order: {
          userId,
          OR: [
            { status: { in: REVIEWABLE_ORDER_STATUSES } },
            { delivery: { status: "delivered" } },
            { delivery: { deliveredAt: { not: null } } },
          ],
        },
      },
      orderBy: [
        { order: { createdAt: "desc" } },
        { createdAt: "desc" },
      ],
      include: orderItemListInclude,
    });

    return items
      .filter((item) => this.isOrderDelivered(item.order))
      .map((item) => this.mapOrderItemForList(item));
  }

  async getOrderItemReview(userId: number, orderItemId: number) {
    const item = await this.prisma.orderItem.findFirst({
      where: {
        id: orderItemId,
        order: { userId },
      },
      include: orderItemWithReviewInclude,
    });

    if (!item) throw new NotFoundException("Order item not found");
    if (!this.isOrderDelivered(item.order)) {
      throw new BadRequestException("Order has not been delivered yet");
    }

    return this.mapOrderItemWithReview(item);
  }

  async submitReview(userId: number, orderItemId: number, dto: CreateOrderItemReviewDto) {
    const item = await this.prisma.orderItem.findFirst({
      where: {
        id: orderItemId,
        order: { userId },
      },
      include: {
        order: { select: orderSelect },
        review: { select: { id: true } },
      },
    });

    if (!item) throw new NotFoundException("Order item not found");
    if (!this.isOrderDelivered(item.order)) {
      throw new BadRequestException("Order has not been delivered yet");
    }

    const overallRating = this.resolveOverallRating(dto);
    const hasImagesInput = Array.isArray(dto.images);
    const images = hasImagesInput ? this.prepareImages(dto.images) : [];
    const data = {
      overallRating,
      qualityRating: dto.qualityRating,
      serviceRating: dto.serviceRating,
      deliveryRating: dto.deliveryRating,
      advantages: this.normalizeText(dto.advantages),
      disadvantages: this.normalizeText(dto.disadvantages),
      comment: this.normalizeText(dto.comment),
      isAnonymous: dto.isAnonymous ?? false,
    };

    await this.prisma.$transaction(async (tx) => {
      let reviewId = item.review?.id;

      if (reviewId) {
        await tx.orderItemReview.update({
          where: { id: reviewId },
          data,
        });
      } else {
        const created = await tx.orderItemReview.create({
          data: {
            ...data,
            orderItemId,
            orderId: item.orderId,
            productId: item.productId,
            userId,
          },
        });
        reviewId = created.id;
      }

      if (hasImagesInput) {
        await tx.orderItemReviewImage.deleteMany({ where: { reviewId } });

        if (images.length) {
          await tx.orderItemReviewImage.createMany({
            data: images.map((image, index) => ({
              reviewId,
              position: index,
              fileId: image.fileId,
              imageUrl: image.imageUrl,
            })),
          });
        }
      }
    });

    return this.getOrderItemReview(userId, orderItemId);
  }

  private mapOrderItemForList(item: OrderItemListPayload) {
    const base = this.mapOrderItemBase(item);
    return {
      ...base,
      hasReview: Boolean(item.review),
      reviewId: item.review?.id ?? null,
    };
  }

  private mapOrderItemWithReview(item: OrderItemWithReviewPayload) {
    const base = this.mapOrderItemBase(item);
    const review = item.review
      ? {
          id: item.review.id,
          productRating: item.review.overallRating,
          qualityRating: item.review.qualityRating,
          serviceRating: item.review.serviceRating,
          deliveryRating: item.review.deliveryRating,
          advantages: item.review.advantages,
          disadvantages: item.review.disadvantages,
          comment: item.review.comment,
          isAnonymous: item.review.isAnonymous,
          images: item.review.images.map((image) => ({
            id: image.id,
            fileId: image.fileId,
            imageUrl: image.imageUrl,
            position: image.position,
          })),
          createdAt: item.review.createdAt,
          updatedAt: item.review.updatedAt,
        }
      : null;

    return {
      ...base,
      review,
    };
  }

  private mapOrderItemBase(item: OrderItemListPayload | OrderItemWithReviewPayload) {
    const category = item.product.category;
    const parent = category?.parent;
    const categoryUz = parent?.nameUz ?? category?.nameUz ?? null;
    const categoryRu = parent?.nameRu ?? category?.nameRu ?? null;
    const subCategoryUz = parent ? category?.nameUz ?? null : null;
    const subCategoryRu = parent ? category?.nameRu ?? null : null;
    const deliveredAt = this.resolveDeliveredAt(item.order);

    return {
      orderItemId: item.id,
      orderId: item.orderId,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.product.nameUz,
      productNameRu: item.product.nameRu,
      productImage: item.product.images[0]?.imageUrl ?? null,
      category: categoryUz,
      categoryRu,
      subCategory: subCategoryUz,
      subCategoryRu,
      deliveredAt,
    };
  }

  private resolveDeliveredAt(order: OrderItemListPayload["order"]) {
    const deliveredAt = order.delivery?.deliveredAt;
    if (deliveredAt) return deliveredAt.toISOString();
    if (this.isOrderDelivered(order)) {
      return (order.updatedAt ?? order.createdAt).toISOString();
    }
    return null;
  }

  private resolveOverallRating(dto: CreateOrderItemReviewDto) {
    if (dto.productRating && dto.productRating > 0) return dto.productRating;
    const average = Math.round((dto.qualityRating + dto.serviceRating + dto.deliveryRating) / 3);
    return Math.min(5, Math.max(1, average));
  }

  private normalizeText(value?: string | null) {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }

  private prepareImages(images?: ReviewImageInputDto[]): PreparedReviewImage[] {
    if (!images || !images.length) return [];

    return images.map<PreparedReviewImage>((image, index) => {
      const fileId = image.fileId ?? null;
      const imageUrl = this.normalizeText(image.imageUrl) ?? null;
      if (fileId === null && !imageUrl) {
        throw new BadRequestException(`Image at position ${index} must include a fileId or imageUrl`);
      }
      return { fileId, imageUrl };
    });
  }

  private isOrderDelivered(order: { status: string | null; delivery?: { status?: string | null; deliveredAt?: Date | null } | null }) {
    const status = order.status?.toLowerCase?.();
    if (status && REVIEWABLE_ORDER_STATUSES.includes(status)) return true;
    const deliveryStatus = order.delivery?.status?.toLowerCase?.();
    if (deliveryStatus === "delivered") return true;
    if (order.delivery?.deliveredAt) return true;
    return false;
  }
}
