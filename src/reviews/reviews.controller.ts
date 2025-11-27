import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import {
  CurrentUser,
  type AuthUser,
} from "../common/decorators/current-user.decorator";
import { ReviewsService } from "./reviews.service";
import { CreateOrderItemReviewDto } from "./dto/create-order-item-review.dto";
import { ProductReviewsQueryDto } from "./dto/product-reviews-query.dto";

@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get("products/:productId")
  async productReviews(
    @Param("productId", ParseIntPipe) productId: number,
    @Query() query: ProductReviewsQueryDto
  ) {
    return this.reviews.getProductReviews(productId, query);
  }

  @Get("eligible")
  @UseGuards(JwtAuthGuard)
  async eligible(@CurrentUser() user: AuthUser) {
    return this.reviews.listEligible(user.id);
  }

  @Get("order-items/:id")
  @UseGuards(JwtAuthGuard)
  async orderItem(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseIntPipe) id: number
  ) {
    return this.reviews.getOrderItemReview(user.id, id);
  }

  @Post("order-items/:id")
  @UseGuards(JwtAuthGuard)
  async submit(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateOrderItemReviewDto
  ) {
    return this.reviews.submitReview(user.id, id, dto);
  }
}
