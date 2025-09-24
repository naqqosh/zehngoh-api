import { Module } from '@nestjs/common'
import { WebAuthnService } from './webauthn.service'
import { WebAuthnController } from './webauthn.controller'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  providers: [WebAuthnService],
  controllers: [WebAuthnController],
})
export class WebAuthnModule {}

