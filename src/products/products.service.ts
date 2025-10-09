import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from 'shared-db'
import { PrismaService } from '../prisma/prisma.service'
import { ListProductsDto } from './dto/list-products.dto'

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async list(query: ListProductsDto) {
    const where: any = { status: 1 }
    if (query.categoryId) where.categoryId = query.categoryId
    if (query.brandId) where.brandId = query.brandId
    if (query.sellerId) where.sellerId = query.sellerId
    if (query.search) {
      const s = query.search
      where.OR = [
        { nameUz: { contains: s, mode: 'insensitive' } },
        { nameRu: { contains: s, mode: 'insensitive' } },
        { slug: { contains: s, mode: 'insensitive' } },
      ]
    }

    const take = query.pageSize ?? 20
    const skip = ((query.page ?? 1) - 1) * take

    // Default: cheapest first (price ascending). Keep explicit overrides.
    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      query.sort === 'price_desc'
        ? [{ priceUzs: 'desc' }]
        : query.sort === 'new'
          ? [{ createdAt: 'desc' }]
          : [{ priceUzs: 'asc' }]

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        take,
        skip,
        orderBy,
        include: {
          images: { where: { isPrimary: true }, take: 1 },
        },
      }),
      this.prisma.product.count({ where }),
    ])

    return {
      items: items.map((p: any) => ({
        id: p.id,
        nameUz: p.nameUz,
        nameRu: p.nameRu,
        priceUzs: p.priceUzs.toString(),
        slug: p.slug,
        imageUrl: p.images[0]?.imageUrl ?? null,
      })),
      total,
      page: query.page ?? 1,
      pageSize: take,
    }
  }

  async getById(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { position: 'asc' } },
        variants: true,
        category: true,
        seller: true,
      },
    })
    if (!product) throw new NotFoundException('Product not found')
    return {
      id: product.id,
      nameUz: product.nameUz,
      nameRu: product.nameRu,
      priceUzs: product.priceUzs.toString(),
      descriptionUz: product.descriptionUz,
      descriptionRu: product.descriptionRu,
      images: product.images.map((i: any) => ({ url: i.imageUrl, blur: i.blurUrl })),
      category: { id: product.categoryId, nameUz: product.category.nameUz, nameRu: product.category.nameRu },
      seller: {
        id: product.sellerId,
        storeName: product.seller.storeName,
        storeNameUz: product.seller.storeNameUz,
        storeNameRu: product.seller.storeNameRu,
        slug: product.seller.slug,
        avatarUrl: product.seller.avatarUrl,
        avatarBlurUrl: product.seller.avatarBlurUrl,
      },
      variants: product.variants.map((v: any) => ({ id: v.id, sku: v.sku, priceUzs: v.priceUzs.toString() })),
    }
  }
}
