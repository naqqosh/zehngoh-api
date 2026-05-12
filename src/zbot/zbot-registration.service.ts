import { Injectable } from "@nestjs/common";
import TelegramBot from "node-telegram-bot-api";
import { PrismaService } from "src/prisma/prisma.service";
import { ZBotService } from "./zbot.service";

@Injectable()
export class ZBotRegistrationService {
  constructor(
    private prisma: PrismaService,
    private zBotService: ZBotService,
  ) {}
  async handleText(bot: TelegramBot, msg: TelegramBot.Message) {
    const telegramId = String(msg?.from?.id);
    const user = await this.prisma.user.findUnique({ where: { telegramId } });

    if (user && user.telegramRegistrationStep === "FULLNAME") {
      const name = msg?.text?.trim();

      if (!name) {
        return this.zBotService.sendRegister(bot, msg.chat.id);
      }

      await this.prisma.user.update({
        data: { fullName: name, telegramRegistrationStep: "PHONE" },
        where: { id: user.id },
      });
      return this.askPhone(bot, msg.chat.id);
    }

    if (user && user.telegramRegistrationStep === "DONE") {
      return this.zBotService.sendRegisterEnd(bot, msg.chat.id);
    }
  }

  async handleAddress(
    bot: TelegramBot,
    query: TelegramBot.CallbackQuery,
    queryData: string | undefined,
  ) {
    const chatId = query.message?.chat.id;

    if (!chatId) {
      return;
    }

    const user = await this.getUserWithTelegramId(String(query.from.id));

    const location = queryData?.split("_")[1];

    if (user) {
      await this.prisma.$transaction(async (tx) => {
        await tx.shippingAddress.create({
          data: {
            userId: user.id,
            recipientName: user.fullName || "",
            phone: user.phone || "",
            addressLine1: location || "",
          },
        });
      });

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          telegramRegistrationStep: "DONE",
        },
      });
      await this.zBotService.sendRegisterEnd(bot, chatId);
    }
  }

  async handleContact(bot: TelegramBot, msg: TelegramBot.Message) {
    const telegramId = String(msg.from?.id);
    const user = await this.getUserWithTelegramId(telegramId);
    const phone = msg.contact?.phone_number;

    if (user && user.telegramRegistrationStep === "PHONE") {
      const concurent = await this.prisma.user.findUnique({
        select: { id: true },
        where: { phone },
      });

      if (concurent) {
        await this.prisma.$transaction(async (tx) => {
          await tx.user.delete({ where: { id: user.id } });

          await tx.user.update({
            data: {
              telegramId,
              fullName: user.fullName,
              telegramRegistrationStep: "ADDRESS",
            },
            where: { id: concurent.id },
          });
        });

        return this.askLocation(bot, msg?.chat.id);
      }

      await this.prisma.user.update({
        data: {
          phone: msg.contact?.phone_number,
          telegramRegistrationStep: "ADDRESS",
        },
        where: { id: user.id },
      });
    }

    await this.askLocation(bot, msg?.chat.id);
  }

  async getUserWithTelegramId(telegramId: string) {
    return this.prisma.user.findUnique({
      select: {
        id: true,
        fullName: true,
        phone: true,
        telegramId: true,
        telegramRegistrationStep: true,
      },
      where: { telegramId: telegramId },
    });
  }

  async isUserBotRegistrationComplete(telegramId: string) {
    const user = await this.getUserWithTelegramId(telegramId);

    if (!user || user.telegramRegistrationStep !== "DONE") {
      return false;
    }

    return true;
  }

  async askPhone(bot: TelegramBot, chatId: number) {
    const keyboard: TelegramBot.ReplyKeyboardMarkup = {
      keyboard: [
        [{ text: "📲 Telefon raqam yuborish", request_contact: true }],
      ],
      resize_keyboard: true,
    };
    await bot.sendMessage(
      chatId,
      "📲 Telefon raqamingizni yuboring.\n\nPastdagi tugmani bosing 👇",
      { reply_markup: keyboard },
    );
  }

  async askLocation(bot: TelegramBot, chatId: number) {
    const keyboards: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: [
        [{ text: "Qo‘rg‘oncha MFY", callback_data: "ADDR_qorgoncha" }],
        [{ text: "Qushtamg‘ali MFY", callback_data: "ADDR_qushtamgali" }],
        [{ text: "Boshqa joyda yashayman", callback_data: "ADDR_other" }],
      ],
    };

    await bot.sendMessage(chatId, "Qayerda yashaysiz ?", {
      reply_markup: { ...keyboards, remove_keyboard: true },
    });
  }
}
