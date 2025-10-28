import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { TelegramGatewayService } from "./telegram-gateway.service";
import { TelegramGatewayController } from "./telegram-gateway.controller";
import { ConfigModule } from "@nestjs/config";
console.log("AuthModule loaded with JWT_SECRET:", process.env.JWT_SECRET);
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || "dev_secret",
      signOptions: { expiresIn: "15m" },
    }),
  ],
  controllers: [AuthController, TelegramGatewayController],
  providers: [AuthService, TelegramGatewayService],
  exports: [AuthService],
})
export class AuthModule {}
