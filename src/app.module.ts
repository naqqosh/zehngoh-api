import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './prisma/prisma.module'
import { HealthModule } from './health/health.module'
import { AuthModule } from './auth/auth.module'
import { ProductsModule } from './products/products.module'
import { WishlistModule } from './wishlist/wishlist.module'
import { CartModule } from './cart/cart.module'
import { OrdersModule } from './orders/orders.module'
import { LookupsModule } from './lookups/lookups.module'
import { WebAuthnModule } from './auth/webauthn.module'
import { FeedbackModule } from './feedback/feedback.module'
import { ReviewsModule } from './reviews/reviews.module'
import { UploadModule } from './upload/upload.module'
import { ShopsModule } from './shops/shops.module'
import { BotModule } from './bot/bot.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    ProductsModule,
    WishlistModule,
    CartModule,
    OrdersModule,
    LookupsModule,
    WebAuthnModule,
    FeedbackModule,
    ReviewsModule,
    UploadModule,
    ShopsModule,
    BotModule,
  ],
})
export class AppModule {}
