import { createHash } from "crypto";

/** Normaliza e hasheia PII para Meta CAPI / Google Enhanced Conversions. */
export function sha256Normalize(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return createHash("sha256").update(normalized).digest("hex");
}

export function hashEmail(email: string | null | undefined): string | null {
  return sha256Normalize(email);
}

/** Telefone: só dígitos; se BR sem +, assume 55. */
export function hashPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length <= 11) digits = `55${digits}`;
  return createHash("sha256").update(digits).digest("hex");
}

/** Hash no browser (Web Crypto) para Enhanced Conversions. */
export async function sha256Browser(value: string): Promise<string> {
  const normalized = value.trim().toLowerCase();
  const data = new TextEncoder().encode(normalized);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashPhoneBrowser(phone: string): Promise<string | null> {
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length <= 11) digits = `55${digits}`;
  const data = new TextEncoder().encode(digits);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
