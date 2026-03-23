import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import { ProductsService } from "./products.service";
import { ListProductsDto } from "./dto/list-products.dto";
import { NewProductsService } from "./new-products.service";

@Controller("products")
export class ProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly newProducts: NewProductsService,
  ) {}

  @Get()
  async list(@Query() query: ListProductsDto) {
    return this.products.list(query);
  }

  @Get("/new")
  async listNew() {
    return this.newProducts.listNew();
  }

  @Get(":id")
  async get(@Param("id", ParseIntPipe) id: number) {
    return this.products.getById(id);
  }
}
