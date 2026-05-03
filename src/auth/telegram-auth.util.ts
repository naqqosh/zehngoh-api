import { BadRequestException } from "@nestjs/common";
import { createHash } from "crypto";

export interface TelegramInitData {
  query_id: string;
  user: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    photo_url?: string;
    is_premium?: boolean;
  };
  auth_date: number;
  hash: string;
  [key: string]: any;
}

function parseInitData(initData: string): Record<string, string> {
  return Object.fromEntries(
    initData.split("&").map((kv) => {
      const [k, v] = kv.split("=");
      return [k, decodeURIComponent(v)];
    }),
  );
}

export function verifyTelegramInitData(
  initData: string,
  botToken: string,
): TelegramInitData {
  const data = parseInitData(initData);
  const { hash, ...fields } = data;
  const dataCheckString = Object.keys(fields)
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join("\n");
  const secret = createHash("sha256").update(botToken).digest();
  const hmac = createHash("sha256")
    .update(dataCheckString)
    .update(secret)
    .digest("hex");
  if (hmac !== hash) {
    throw new BadRequestException("Invalid Telegram initData signature");
  }
  // Check auth_date is not too old (e.g. 1 day)
  if (Date.now() / 1000 - Number(data.auth_date) > 86400) {
    throw new BadRequestException("Telegram initData expired");
  }
  // Parse user JSON
  if (data.user) {
    try {
      data.user = JSON.parse(data.user);
    } catch {
      // fallback: user is not JSON
    }
  }
  return data as unknown as TelegramInitData;
}
