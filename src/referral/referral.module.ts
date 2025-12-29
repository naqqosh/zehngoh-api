import { Module } from "@nestjs/common";
import { ReferralService } from "./referral.service";
import { ReferralController } from "./referral.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [ReferralService],
  controllers: [ReferralController],
  exports: [ReferralService],
})
export class ReferralModule {}
