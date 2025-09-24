import { Controller, Get, Query } from '@nestjs/common'
import { LookupsService } from './lookups.service'

@Controller('lookups')
export class LookupsController {
  constructor(private readonly lookups: LookupsService) {}

  @Get('categories')
  async categories() {
    return this.lookups.categories()
  }

  @Get('brands')
  async brands() {
    return this.lookups.brands()
  }

  @Get('regions')
  async regions() {
    return this.lookups.regions()
  }

  @Get('cities')
  async cities(@Query('regionId') regionId?: string) {
    return this.lookups.cities(regionId ? Number(regionId) : undefined)
  }
}

