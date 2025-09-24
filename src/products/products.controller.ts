import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common'
import { ProductsService } from './products.service'
import { ListProductsDto } from './dto/list-products.dto'

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  async list(@Query() query: ListProductsDto) {
    return this.products.list(query)
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return this.products.getById(id)
  }
}

