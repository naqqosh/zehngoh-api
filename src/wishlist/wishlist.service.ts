import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  async ensureWishlist(userId: number) {
    const existing = await this.prisma.wishlist.findUnique({ where: { userId } })
    if (existing) return existing
    return this.prisma.wishlist.create({ data: { userId } })
  }

  async list(userId: number) {
    const wl = await this.ensureWishlist(userId)
    const items = await this.prisma.wishlistItem.findMany({
      where: { wishlistId: wl.id },
      include: {
        product: { include: { images: { where: { isPrimary: true }, take: 1 } } },
      },
    })
    return items.map((i: any) => ({
      productId: i.productId,
      nameUz: i.product.nameUz,
      nameRu: i.product.nameRu,
      priceUzs: i.product.priceUzs.toString(),
      imageUrl: i.product.images[0]?.imageUrl ?? null,
      status: i.product.status,
      moderationStatus: i.product.moderationStatus,
    }))
  }

  async add(userId: number, productId: number) {
    const wl = await this.ensureWishlist(userId)
    await this.prisma.wishlistItem.upsert({
      where: { wishlistId_productId: { wishlistId: wl.id, productId } },
      create: { wishlistId: wl.id, productId },
      update: {},
    })
  }

  async remove(userId: number, productId: number) {
    const wl = await this.ensureWishlist(userId)
    await this.prisma.wishlistItem.delete({ where: { wishlistId_productId: { wishlistId: wl.id, productId } } })
  }
}
