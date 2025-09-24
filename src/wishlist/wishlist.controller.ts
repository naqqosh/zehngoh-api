import { Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import { WishlistService } from './wishlist.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlist: WishlistService) {}

  @Get()
  async list(@CurrentUser() user: any) {
    return this.wishlist.list(user.id)
  }

  @Post(':productId')
  async add(@CurrentUser() user: any, @Param('productId', ParseIntPipe) productId: number) {
    await this.wishlist.add(user.id, productId)
    return { success: true }
  }

  @Delete(':productId')
  async remove(@CurrentUser() user: any, @Param('productId', ParseIntPipe) productId: number) {
    await this.wishlist.remove(user.id, productId)
    return { success: true }
  }
}

