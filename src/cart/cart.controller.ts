import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common'
import { CartService } from './cart.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AddItemDto } from './dto/add-item.dto'
import { UpdateQtyDto } from './dto/update-qty.dto'

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  async get(@CurrentUser() user: any) {
    return this.cart.getActiveCart(user.id)
  }

  @Post('items')
  async add(@CurrentUser() user: any, @Body() dto: AddItemDto) {
    await this.cart.addItem(user.id, dto)
    return { success: true }
  }

  @Patch('items/:itemId')
  async updateQty(
    @CurrentUser() user: any,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateQtyDto,
  ) {
    await this.cart.updateQuantity(user.id, itemId, dto.quantity)
    return { success: true }
  }

  @Delete('items/:itemId')
  async remove(@CurrentUser() user: any, @Param('itemId', ParseIntPipe) itemId: number) {
    await this.cart.removeItem(user.id, itemId)
    return { success: true }
  }

  @Delete()
  async clear(@CurrentUser() user: any) {
    await this.cart.clear(user.id)
    return { success: true }
  }
}

