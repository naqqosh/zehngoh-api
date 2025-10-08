import { Controller, Get, Param } from '@nestjs/common'
import { ShopsService } from './shops.service'

@Controller('shops')
export class ShopsController {
  constructor(private readonly shops: ShopsService) {}

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.shops.getBySlug(slug)
  }
}

