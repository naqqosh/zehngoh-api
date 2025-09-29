import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class ReviewImageInputDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  fileId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string;
}

export class CreateOrderItemReviewDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  productRating?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  qualityRating!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  serviceRating!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  deliveryRating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  advantages?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  disadvantages?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => ReviewImageInputDto)
  images?: ReviewImageInputDto[];
}
