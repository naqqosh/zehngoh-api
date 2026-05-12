import { Injectable, Logger } from "@nestjs/common";
import * as fs from "fs";
import TelegramBot from "node-telegram-bot-api";
import * as path from "path";

@Injectable()
export class ZBotService {
  private readonly logger = new Logger(ZBotService.name);

  getMediaStream(filename: string) {
    try {
      const filePath = path.join(__dirname, "/media", filename);
      return fs.createReadStream(filePath);
    } catch (error) {
      this.logger.error(
        `Failed to load media: ${filename}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async sendWelcome(bot: TelegramBot, chatId: number) {
    try {
      const keyboard: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: [
          [{ text: "🛒 Buyurtma berish", callback_data: "OPEN_ORDER" }],
          [{ text: "📞 Aloqa", callback_data: "CONTACT" }],
        ],
      };

      await bot.sendVideo(chatId, this.getMediaStream("welcome.mp4"), {
        reply_markup: keyboard,
      });
    } catch (error) {
      this.logger.error(
        "Error sending welcome video",
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async sendRegister(bot: TelegramBot, chatId: number) {
    try {
      const caption: string = "1) Ism va Familyangizni kiriting:";
      await bot.sendVideo(chatId, this.getMediaStream("register.mp4"), {
        caption,
      });
    } catch (error) {
      this.logger.error(
        "Error sending register video",
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async sendRegisterEnd(bot: TelegramBot, chatId: number) {
    try {
      const keyboards: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: [
          [
            {
              text: "🛒 Buyurtma berish",
              web_app: { url: "https://www.zehngoh.uz" },
            },
          ],
          [
            {
              text: "📞 Aloqa",
              callback_data: "CONTACT",
            },
          ],
        ],
      };

      await bot.sendVideo(chatId, this.getMediaStream("register_end.mp4"), {
        caption:
          "✅ Ro‘yxatdan o‘tish yakunlandi! \n\n Endi bemalol mahsulot tanlab buyurtma berishingiz mumkin. 🛒",
        reply_markup: keyboards,
      });
    } catch (error) {
      this.logger.error(
        "Error sending register_end video",
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async sendAccepted(bot: TelegramBot, chatId: number) {
    try {
      await bot.sendVideo(chatId, this.getMediaStream("accepted.mp4"));
    } catch (error) {
      this.logger.error(
        "Error sending accepted video",
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async sendReady(bot: TelegramBot, chatId: number) {
    try {
      await bot.sendVideo(chatId, this.getMediaStream("ready.mp4"));
    } catch (error) {
      this.logger.error(
        "Error sending ready video",
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async sendDelivered(bot: TelegramBot, chatId: number) {
    try {
      await bot.sendVideo(chatId, this.getMediaStream("delivered.mp4"));
    } catch (error) {
      this.logger.error(
        "Error sending delivered video",
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async sendDelay(bot: TelegramBot, chatId: number) {
    try {
      await bot.sendVideo(chatId, this.getMediaStream("delay.mp4"));
    } catch (error) {
      this.logger.error(
        "Error sending delay video",
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async askContact(bot: TelegramBot, chatId: number) {
    const keyboard: TelegramBot.ReplyKeyboardMarkup = {
      keyboard: [[{ text: "📲 Raqam yuborish", request_contact: true }]],
      resize_keyboard: true,
    };

    await bot.sendMessage(
      chatId,
      "Telefon raqamingizni pastdagi tugmachani bosish orqali yuboring",
      { reply_markup: keyboard },
    );
  }
}
