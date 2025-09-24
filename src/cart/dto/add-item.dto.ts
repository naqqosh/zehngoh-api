import { IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class AddItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId!: number

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  variantId?: number

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number = 1
}

