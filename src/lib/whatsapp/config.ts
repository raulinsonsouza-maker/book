import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/platform-secrets";

export type PlatformWaRuntimeConfig = {
  enabled: boolean;
  phoneNumberId: string | null;
  wabaId: string | null;
  accessToken: string | null;
  displayNumber: string | null;
  templateOtpName: string;
  templateReminderName: string;
  templateConfirmName: string | null;
  webhookVerifyToken: string | null;
  defaultButtonBaseUrl: string | null;
  lastError: string | null;
};

let cache: { at: number; value: PlatformWaRuntimeConfig } | null = null;
const TTL_MS = 15_000;

export async function getPlatformWhatsAppConfig(
  bypassCache = false,
): Promise<PlatformWaRuntimeConfig> {
  if (!bypassCache && cache && Date.now() - cache.at < TTL_MS) {
    return cache.value;
  }

  const row = await prisma.platformWhatsAppConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  const fromDb = decryptSecret(row.accessTokenEncrypted);
  const fromEnv = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || null;

  const value: PlatformWaRuntimeConfig = {
    enabled: row.enabled,
    phoneNumberId:
      row.phoneNumberId?.trim() ||
      process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ||
      null,
    wabaId: row.wabaId?.trim() || process.env.WHATSAPP_WABA_ID?.trim() || null,
    accessToken: fromDb || fromEnv,
    displayNumber: row.displayNumber,
    templateOtpName: row.templateOtpName || "book_auth_otp",
    templateReminderName: row.templateReminderName || "book_booking_reminder",
    templateConfirmName: row.templateConfirmName,
    webhookVerifyToken:
      row.webhookVerifyToken ||
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim() ||
      null,
    defaultButtonBaseUrl:
      row.defaultButtonBaseUrl ||
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      null,
    lastError: row.lastError,
  };

  cache = { at: Date.now(), value };
  return value;
}

export function invalidateWhatsAppConfigCache() {
  cache = null;
}
