import { Module } from '@nestjs/common'
import { WebAuthnService } from './webauthn.service'
import { WebAuthnController } from './webauthn.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { AuthModule } from './auth.module'

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [WebAuthnService],
  controllers: [WebAuthnController],
})
export class WebAuthnModule {}
