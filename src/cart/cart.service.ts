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
      include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } } },
      orderBy: { id: 'asc' },
    })
    const totalItems = items.reduce((s: number, i: any) => s + i.quantity, 0)
    const totalPrice = items.reduce(
      (s: number, i: any) => s + Number(i.product.priceUzs) * i.quantity,
      0,
    )
    return {
      id: cart.id,
      status: cart.status,
      items: items.map((i: any) => ({
        id: i.id,
        productId: i.productId,
        nameUz: i.product.nameUz,
        nameRu: i.product.nameRu,
        priceUzs: i.product.priceUzs.toString(),
        quantity: i.quantity,
        imageUrl: i.product.images[0]?.imageUrl ?? null,
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
