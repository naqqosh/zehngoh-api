import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import { OrdersService } from './orders.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { CreateOrderDto } from './dto/create-order.dto'

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  async list(@CurrentUser() user: any) {
    return this.orders.list(user.id)
  }

  @Get(':id')
  async get(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.orders.get(user.id, id)
  }

  @Post()
  async create(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    const { orderId } = await this.orders.create(user.id, dto)
    return { id: orderId }
  }

  @Post(':id/cancel')
  async cancel(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    await this.orders.cancel(user.id, id)
    return { success: true }
  }
}
