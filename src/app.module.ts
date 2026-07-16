import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { ProductsModule } from "./products/products.module";
import { WishlistModule } from "./wishlist/wishlist.module";
import { CartModule } from "./cart/cart.module";
import { OrdersModule } from "./orders/orders.module";
import { LookupsModule } from "./lookups/lookups.module";
import { WebAuthnModule } from "./auth/webauthn.module";
import { FeedbackModule } from "./feedback/feedback.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { UploadModule } from "./upload/upload.module";
import { ShopsModule } from "./shops/shops.module";
import { BotModule } from "./bot/bot.module";
import { ZehngohBotModule } from "./zbot/zbot.module";
import { ReferralModule } from "./referral/referral.module";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "staging", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3006),
  JWT_SECRET: z.string().trim().min(17),
  CORS_ORIGINS: z.string().trim().min(1),
  TELEGRAM_GATEWAY_TOKEN: z.string().trim().min(1),
  TELEGRAM_GATEWAY_API_BASE: z.string().trim().min(1),
  TELEGRAM_GATEWAY_TEMPLATE_ID: z.string().trim().optional(),
  TELEGRAM_GATEWAY_WEBHOOK_SECRET: z.string().trim().optional(),
  POSTGRES_USER: z.string().trim().min(1),
  POSTGRES_PASSWORD: z.string().trim().min(1),
  POSTGRES_DB: z.string().trim().min(1),
  DATABASE_URL: z.string().trim().pipe(z.url()),
  TELEGRAM_BOT_MODE: z.enum(["polling", "webhook"]).default("polling"),
  TELEGRAM_BOT_TOKEN: z.string().trim().min(1),
  TELEGRAM_ZEHNGOH_BOT_TOKEN: z.string().trim().min(1),
  TELEGRAM_ADMIN_CHAT_ID: z.coerce.number().int().positive(),
  TELEGRAM_BOT_SECRET_TOKEN: z.string().trim().min(1),
  TELEGRAM_BOT_WEBHOOK_URL: z.string().trim().pipe(z.url()),
  TELEGRAM_BOT_ACTION_SECRET: z.string().trim().min(1),
  WEBAUTHN_RP_ID: z.string().trim().optional(),
  WEBAUTHN_RP_NAME: z.string().trim().optional(),
  WEBAUTHN_ORIGIN: z.string().trim().optional(),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        const parsed = envSchema.safeParse(config);

        if (!parsed.success) {
          throw new Error(
            parsed.error.issues
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join("\n"),
          );
        }

        return parsed.data;
      },
      cache: true,
    }),
    PrismaModule,
    HealthModule,
    ReferralModule,
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
    ReferralModule,
    ZehngohBotModule,
  ],
})
export class AppModule {}
