import { Type } from "class-transformer";
import { IsInt, Min } from "class-validator";

export class ProductReviewsSummaryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId: number = 1;
}
