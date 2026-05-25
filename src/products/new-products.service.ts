// Simple in-memory cache for new products
let newProductsCache: { data: any; expiresAt: number } | null = null;
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class NewProductsService {
  // Hardcoded new product IDs
  private readonly newProductIds = [319, 24, 317, 318, 316, 139];

  constructor(private prisma: PrismaService) {}

  async listNew() {
    const now = Date.now();
    if (newProductsCache && newProductsCache.expiresAt > now) {
      return newProductsCache.data;
    }
    const items = await this.prisma.product.findMany({
      where: {
        id: { in: this.newProductIds },
        status: 1,
      },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
      },
    });

    // Fetch review summaries for all products in batch
    const productIds = items.map((p: any) => p.id);
    const reviewSummaries = await this.prisma.orderItemReview.groupBy({
      by: ["productId"],
      where: { productId: { in: productIds } },
      _count: true,
      _avg: { qualityRating: true },
    });

    // Build map of productId -> { count, avgRating }
    const summaryMap = new Map<number, { count: number; avgRating: number }>();
    reviewSummaries.forEach((summary: any) => {
      summaryMap.set(summary.productId, {
        count: summary._count,
        avgRating: summary._avg.qualityRating
          ? Math.round(summary._avg.qualityRating * 10) / 10
          : 0,
      });
    });

    const result = {
      items: items.map((p: any) => {
        const summary = summaryMap.get(p.id) ?? { count: 0, avgRating: 0 };
        return {
          id: p.id,
          nameUz: p.nameUz,
          nameRu: p.nameRu,
          priceUzs: p.priceUzs.toString(),
          slug: p.slug,
          imageUrl: p.images[0]?.imageUrl ?? null,
          imageBlurUrl: p.images[0]?.blurUrl ?? null,
          status: p.status,
          moderationStatus: p.moderationStatus,
          rating: summary.avgRating,
          reviews: summary.count,
        };
      }),
      total: items.length,
    };
    // Cache for 1 hour
    newProductsCache = {
      data: result,
      expiresAt: now + 60 * 60 * 1000,
    };
    return result;
  }
}
