import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ShopsService {
  constructor(private prisma: PrismaService) {}

  async getBySlug(slug: string) {
    const shop = await this.prisma.seller.findUnique({ where: { slug } })
    if (!shop) throw new NotFoundException('Shop not found')

    const productCount = await this.prisma.product.count({
      where: { sellerId: shop.id, status: 1 },
    })

    return {
      id: shop.id,
      slug: shop.slug,
      storeName: shop.storeName,
      storeNameUz: shop.storeNameUz,
      storeNameRu: shop.storeNameRu,
      description: shop.description,
      createdAt: shop.createdAt.toISOString(),
      avatarUrl: shop.avatarUrl,
      avatarBlurUrl: shop.avatarBlurUrl,
      coverUrl: shop.coverUrl,
      coverBlurUrl: shop.coverBlurUrl,
      productCount,
    }
  }
}
