/** Extrai Pixel ID numérico de texto puro ou snippet fbq('init', '...'). */
export function parseMetaPixelId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const initMatch = trimmed.match(
    /fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d{5,20})['"]/i,
  );
  if (initMatch?.[1]) return initMatch[1];

  const idMatch = trimmed.match(/\b(\d{5,20})\b/);
  if (idMatch?.[1]) return idMatch[1];

  return null;
}

/** Extrai send_to AW-xxxxx/label de texto puro ou snippet gtag. */
export function parseGoogleAdsSendTo(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const sendToMatch = trimmed.match(
    /(?:send_to['"]?\s*:\s*['"]|['"])?(AW-\d{5,15}\/[A-Za-z0-9_-]{4,})/i,
  );
  if (sendToMatch?.[1]) return sendToMatch[1];

  const bare = trimmed.match(/^(AW-\d{5,15}\/[A-Za-z0-9_-]{4,})$/i);
  if (bare?.[1]) return bare[1];

  return null;
}

export function parseGoogleAdsTagId(sendTo: string | null | undefined): string | null {
  if (!sendTo) return null;
  const m = sendTo.match(/^(AW-\d{5,15})\//i);
  return m?.[1] ?? null;
}

/** Token CAPI: aceita string longa alfanumérica; rejeita vazio. */
export function parseMetaCapiToken(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length < 20) return null;
  if (!/^[A-Za-z0-9|_-]+$/.test(trimmed)) return null;
  return trimmed;
}

export function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}
