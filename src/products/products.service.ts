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

    // Default: premium first (price descending). Keep explicit overrides.
    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      query.sort === 'price_asc'
        ? [{ priceUzs: 'asc' }]
        : query.sort === 'new'
          ? [{ createdAt: 'desc' }]
          : [{ priceUzs: 'desc' }]

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
        imageBlurUrl: p.images[0]?.blurUrl ?? null,
        status: p.status,
        moderationStatus: p.moderationStatus,
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
        images: { orderBy: [{ position: 'asc' }, { id: 'asc' }] },
        variants: {
          where: { status: 1 },
          orderBy: { id: 'asc' },
          include: {
            attributes: {
              include: {
                attribute: true,
                value: true,
              },
            },
          },
        },
        category: true,
        seller: true,
      },
    })
    if (!product) throw new NotFoundException('Product not found')

    const normalizeImage = (img: any) => ({
      url: img.imageUrl,
      blur: img.blurUrl,
      width: img.width ?? null,
      height: img.height ?? null,
    })

    const generalImages: any[] = []
    const attributeImagesMap = new Map<number, any[]>()
    const variantImagesMap = new Map<number, any[]>()

    for (const img of product.images) {
      const normalized = normalizeImage(img)
      if (img.attributeValueId) {
        const existing = attributeImagesMap.get(img.attributeValueId) ?? []
        existing.push(normalized)
        attributeImagesMap.set(img.attributeValueId, existing)
      }
      if (img.variantId) {
        const existing = variantImagesMap.get(img.variantId) ?? []
        existing.push(normalized)
        variantImagesMap.set(img.variantId, existing)
      }
      if (!img.attributeValueId && !img.variantId) {
        generalImages.push(normalized)
      }
    }

    const attributeMap = new Map<
      number,
      {
        id: number
        nameUz: string
        nameRu: string
        type: string | null
        values: Map<
          number,
          {
            id: number
            nameUz: string
            nameRu: string
            color: string | null
            images: any[]
          }
        >
      }
    >()

    for (const variant of product.variants) {
      for (const attr of variant.attributes ?? []) {
        if (!attr.attribute || !attr.value) continue
        if (!attributeMap.has(attr.attributeId)) {
          attributeMap.set(attr.attributeId, {
            id: attr.attributeId,
            nameUz: attr.attribute.nameUz,
            nameRu: attr.attribute.nameRu,
            type: attr.attribute.type ?? null,
            values: new Map(),
          })
        }
        const attrEntry = attributeMap.get(attr.attributeId)!
        if (!attrEntry.values.has(attr.valueId)) {
          attrEntry.values.set(attr.valueId, {
            id: attr.valueId,
            nameUz: attr.value.nameUz,
            nameRu: attr.value.nameRu,
            color: attr.value.color ?? null,
            images: attributeImagesMap.get(attr.valueId) ?? [],
          })
        } else if (!attrEntry.values.get(attr.valueId)!.images.length && attributeImagesMap.has(attr.valueId)) {
          attrEntry.values.get(attr.valueId)!.images = attributeImagesMap.get(attr.valueId) ?? []
        }
      }
    }

    const attributes = Array.from(attributeMap.values()).map((attr) => ({
      id: attr.id,
      nameUz: attr.nameUz,
      nameRu: attr.nameRu,
      type: attr.type,
      values: Array.from(attr.values.values()),
    }))

    const variants = product.variants.map((variant: any) => ({
      id: variant.id,
      sku: variant.sku,
      priceUzs: variant.priceUzs.toString(),
      discountFixedUzs:
        variant.discountFixedUzs != null ? (variant.discountFixedUzs as unknown as bigint).toString() : '0',
      attributes: (variant.attributes ?? []).map((attr: any) => ({
        attributeId: attr.attributeId,
        attributeNameUz: attr.attribute?.nameUz ?? null,
        attributeNameRu: attr.attribute?.nameRu ?? null,
        attributeType: attr.attribute?.type ?? null,
        valueId: attr.valueId,
        valueNameUz: attr.value?.nameUz ?? null,
        valueNameRu: attr.value?.nameRu ?? null,
        valueColor: attr.value?.color ?? null,
      })),
      images: variantImagesMap.get(variant.id) ?? [],
    }))

    return {
      id: product.id,
      nameUz: product.nameUz,
      nameRu: product.nameRu,
      priceUzs: product.priceUzs.toString(),
      status: product.status,
      moderationStatus: product.moderationStatus,
      descriptionUz: product.descriptionUz,
      descriptionRu: product.descriptionRu,
      images: generalImages,
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
      variants,
      attributes,
    }
  }
}
