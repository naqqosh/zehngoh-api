import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AddItemDto } from './dto/add-item.dto'
import { Prisma } from 'shared-db'

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  private async ensureActiveCart(userId: number) {
    let cart = await this.prisma.cart.findFirst({ where: { userId, status: 'active' } })
    if (!cart) cart = await this.prisma.cart.create({ data: { userId } })
    return cart
  }

  async getActiveCart(userId: number) {
    const cart = await this.ensureActiveCart(userId)
    const items = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: {
        product: { include: { images: { where: { isPrimary: true }, take: 1 } } },
        variant: {
          include: {
            attributes: {
              include: {
                attribute: true,
                value: true,
              },
            },
            images: { take: 1, orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }, { id: 'asc' }] },
          },
        },
      },
      orderBy: { id: 'asc' },
    })
    const totalItems = items.reduce((s: number, i: any) => s + i.quantity, 0)
    const totalPrice = items.reduce((s: number, i: any) => {
      const variantPrice = i.variant ? Number(i.variant.priceUzs as unknown as bigint) : null
      const price = variantPrice && variantPrice > 0 ? variantPrice : Number(i.product.priceUzs)
      return s + price * i.quantity
    }, 0)
    return {
      id: cart.id,
      status: cart.status,
      items: items.map((i: any) => ({
        id: i.id,
        productId: i.productId,
        variantId: i.variantId,
        nameUz: i.product.nameUz,
        nameRu: i.product.nameRu,
        priceUzs: (() => {
          const variantPrice = i.variant ? Number(i.variant.priceUzs as unknown as bigint) : null
          const price = variantPrice && variantPrice > 0 ? variantPrice : Number(i.product.priceUzs)
          return price.toString()
        })(),
        quantity: i.quantity,
        imageUrl: i.product.images[0]?.imageUrl ?? null,
        variantAttributes: (i.variant?.attributes ?? []).map((attr: any) => ({
          attributeId: attr.attributeId,
          attributeNameUz: attr.attribute?.nameUz ?? null,
          attributeNameRu: attr.attribute?.nameRu ?? null,
          attributeType: attr.attribute?.type ?? null,
          valueId: attr.valueId,
          valueNameUz: attr.value?.nameUz ?? null,
          valueNameRu: attr.value?.nameRu ?? null,
          valueColor: attr.value?.color ?? null,
        })),
        variantPriceUzs: i.variant ? (Number(i.variant.priceUzs as unknown as bigint) || 0).toString() : null,
        variantImageUrl:
          i.variant?.images && i.variant.images.length > 0 ? i.variant.images[0]?.imageUrl ?? null : null,
      })),
      totalItems,
      totalPrice: totalPrice.toString(),
    }
  }

  async addItem(userId: number, dto: AddItemDto) {
    const cart = await this.ensureActiveCart(userId)
    // Ensure product exists
    await this.prisma.product.findUniqueOrThrow({ where: { id: dto.productId } })
    const quantity = dto.quantity ?? 1
    const createData: Prisma.CartItemUncheckedCreateInput = {
      cartId: cart.id,
      productId: dto.productId,
      variantId: dto.variantId ?? null,
      quantity,
    }

    if (dto.variantId != null) {
      await this.prisma.cartItem.upsert({
        where: {
          cartId_productId_variantId: {
            cartId: cart.id,
            productId: dto.productId,
            variantId: dto.variantId,
          },
        },
        update: { quantity: { increment: quantity } },
        create: createData,
      })
    } else {
      const existing = await this.prisma.cartItem.findFirst({
        where: { cartId: cart.id, productId: dto.productId, variantId: null },
      })
      if (existing) {
        await this.prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + quantity },
        })
      } else {
        await this.prisma.cartItem.create({ data: createData })
      }
    }
  }

  async updateQuantity(userId: number, itemId: number, quantity: number) {
    const cart = await this.ensureActiveCart(userId)
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } })
    if (!item) throw new NotFoundException('Item not found')
    if (quantity <= 0) return this.removeItem(userId, itemId)
    await this.prisma.cartItem.update({ where: { id: item.id }, data: { quantity } })
  }

  async removeItem(userId: number, itemId: number) {
    const cart = await this.ensureActiveCart(userId)
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } })
    if (!item) return
    await this.prisma.cartItem.delete({ where: { id: item.id } })
  }

  async clear(userId: number) {
    const cart = await this.ensureActiveCart(userId)
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } })
  }
}
