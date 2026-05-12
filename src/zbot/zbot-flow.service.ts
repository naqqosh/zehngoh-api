import { Injectable, Logger } from "@nestjs/common";
import { ZBotService } from "./zbot.service";
import { ZBotRegistrationService } from "./zbot-registration.service";
import { PrismaService } from "../prisma/prisma.service";
import TelegramBot from "node-telegram-bot-api";

@Injectable()
export class ZBotFlowService {
  private readonly logger = new Logger(ZBotFlowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly zbotService: ZBotService,
    private readonly registrationService: ZBotRegistrationService,
  ) {}

  async handleUpdate(
    bot: TelegramBot,
    msg: TelegramBot.Message | TelegramBot.CallbackQuery,
  ) {
    try {
      if ("data" in msg) {
        await this.handleCallbackQuery(bot, msg);
      } else if ("text" in msg && msg.text && msg.text.startsWith("/start")) {
        await this.handleStart(bot, msg);
      } else if ("contact" in msg && msg.contact) {
        await this.handleContact(bot, msg);
      } else if ("text" in msg && msg.text) {
        await this.handleText(bot, msg);
      }
    } catch (error) {
      this.logger.error(
        "Error in handleUpdate",
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async handleStart(bot: TelegramBot, msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const telegramId = String(msg.from?.id);

    let user = await this.prisma.user.findUnique({ where: { telegramId } });

    if (user && user.telegramRegistrationStep === "DONE") {
      return this.zbotService.sendRegisterEnd(bot, chatId);
    }

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          telegramId,
          telegramRegistrationStep: "FULLNAME",
        },
      });
    }

    await this.zbotService.sendWelcome(bot, chatId);
  }

  private async handleCallbackQuery(
    bot: TelegramBot,
    query: TelegramBot.CallbackQuery,
  ) {
    const telegramId = String(query.from.id);
    const chatId = query.message?.chat.id;
    if (!chatId) return;
    if (query.data === "OPEN_ORDER") {
      const user = await this.prisma.user.findUnique({ where: { telegramId } });
      if (!user || user.telegramRegistrationStep !== "DONE") {
        if (query.message) {
          await this.zbotService.sendRegister(bot, chatId);
        }
        return;
      }
      await bot.sendMessage(
        chatId,
        "✅ Ro‘yxatdan o‘tish yakunlandi! \n\n Endi bemalol mahsulot tanlab buyurtma berishingiz mumkin. 🛒",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🛒 Buyurtma berish",
                  web_app: { url: "https://www.zehngoh.uz" },
                },
                {
                  text: "📞 Aloqa",
                  callback_data: "CONTACT",
                },
              ],
            ],
          },
        },
      );
    } else if (query.data === "CONTACT") {
      await bot.sendMessage(
        chatId,
        "📞 Aloqa: <b>+998 99 630 78 34</b> \n\n🕗 Ish vaqti: <b>08:30 – 22:30</b> \n\n📍 Hudud: <b>Qo‘rg‘oncha va Qushtamg‘ali MFY</b>",
        { parse_mode: "HTML" },
      );
    } else if (query?.data?.startsWith("ADDR_")) {
      await this.registrationService.handleAddress(bot, query, query.data);
    }
    await bot.answerCallbackQuery(query.id);
  }

  private async handleContact(bot: TelegramBot, msg: TelegramBot.Message) {
    await this.registrationService.handleContact(bot, msg);
  }

  private async handleText(bot: TelegramBot, msg: TelegramBot.Message) {
    await this.registrationService.handleText(bot, msg);
  }
}
