import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { TelegramGatewayService } from './telegram-gateway.service'
import { TelegramGatewayController } from './telegram-gateway.controller'

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'dev_secret',
      signOptions: { expiresIn: '30d' },
    }),
  ],
  controllers: [AuthController, TelegramGatewayController],
  providers: [AuthService, TelegramGatewayService],
})
export class AuthModule {}
