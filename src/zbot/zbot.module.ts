import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { ZBotGateway } from "./zbot.gateway";
import { ZBotService } from "./zbot.service";
import { ZBotRegistrationService } from "./zbot-registration.service";
import { ZBotFlowService } from "./zbot-flow.service";

@Module({
  imports: [PrismaModule],
  controllers: [],
  providers: [
    ZBotGateway,
    ZBotService,
    ZBotRegistrationService,
    ZBotFlowService,
  ],
})
export class ZehngohBotModule {}
