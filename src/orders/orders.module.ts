import { Module } from '@nestjs/common'
import { BotModule } from '../bot/bot.module'
import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'

@Module({
  imports: [BotModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
