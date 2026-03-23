import { Module } from "@nestjs/common";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import { NewProductsService } from "./new-products.service";

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, NewProductsService],
})
export class ProductsModule {}
