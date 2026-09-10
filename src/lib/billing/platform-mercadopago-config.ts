import { addSeconds } from "date-fns";
import { prisma } from "@/lib/prisma";
import {
  decryptSecret,
  encryptSecret,
  maskSecret,
} from "@/lib/platform-secrets";

export type PlatformMpCredentials = {
  accessToken: string;
  publicKey: string;
  refreshToken: string | null;
  userId: string | null;
  expiresAt: Date | null;
  nickname: string | null;
};

export type MpAppCredentials = {
  clientId: string;
  clientSecret: string;
};

async function getRow() {
  return prisma.platformMercadoPagoConfig.findUnique({
    where: { id: "singleton" },
  });
}

/** Marcador gravado no DB quando o admin desconecta — ignora fallback do .env. */
const CLEARED_MARKER = "cleared:";

function isCredentialsCleared(stored: string | null | undefined) {
  return Boolean(stored?.startsWith(CLEARED_MARKER));
}

export async function ensurePlatformMpConfigRow() {
  return prisma.platformMercadoPagoConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}

export async function getMpAppCredentials(): Promise<MpAppCredentials | null> {
  const row = await getRow();
  const clientId =
    row?.clientId?.trim() || process.env.MERCADOPAGO_CLIENT_ID?.trim() || "";
  const clientSecret =
    decryptSecret(row?.clientSecretEncrypted)?.trim() ||
    process.env.MERCADOPAGO_CLIENT_SECRET?.trim() ||
    "";
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export async function mercadoPagoOAuthAppConfigured() {
  return Boolean(await getMpAppCredentials());
}

export function getPlatformMercadoPagoRedirectUri() {
  // Mesma URI dos salões — já cadastrada no app do Mercado Pago Developers.
  const configured = process.env.MERCADOPAGO_REDIRECT_URI?.trim();
  if (configured) return configured;
  const base =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/mercadopago/callback`;
}

export async function getPlatformMpAccessToken(): Promise<string | null> {
  const row = await getRow();
  if (isCredentialsCleared(row?.accessTokenEncrypted)) return null;
  const fromDb = decryptSecret(row?.accessTokenEncrypted)?.trim();
  if (fromDb) return fromDb;
  return process.env.PLATFORM_MERCADOPAGO_ACCESS_TOKEN?.trim() || null;
}

export async function getPlatformMpPublicKey(): Promise<string | null> {
  const row = await getRow();
  if (isCredentialsCleared(row?.accessTokenEncrypted)) return null;
  const fromDb = row?.publicKey?.trim();
  if (fromDb) return fromDb;
  return process.env.PLATFORM_MERCADOPAGO_PUBLIC_KEY?.trim() || null;
}

export async function isPlatformBillingEnabled() {
  const row = await getRow();
  if (row) {
    if (isCredentialsCleared(row.accessTokenEncrypted)) return false;
    return row.billingEnabled;
  }
  return process.env.PLATFORM_BILLING_ENABLED === "true";
}

export async function platformMercadoPagoConfigured() {
  const [token, pk] = await Promise.all([
    getPlatformMpAccessToken(),
    getPlatformMpPublicKey(),
  ]);
  return Boolean(token && pk);
}

export async function getPlatformMpAdminStatus() {
  await ensurePlatformMpConfigRow();
  const row = await getRow();
  const cleared = isCredentialsCleared(row?.accessTokenEncrypted);
  const accessToken = cleared
    ? null
    : decryptSecret(row?.accessTokenEncrypted);
  const clientSecret = decryptSecret(row?.clientSecretEncrypted);
  const envToken = Boolean(
    process.env.PLATFORM_MERCADOPAGO_ACCESS_TOKEN?.trim(),
  );
  const envPublicKey = Boolean(
    process.env.PLATFORM_MERCADOPAGO_PUBLIC_KEY?.trim(),
  );
  const app = await getMpAppCredentials();
  const effectiveToken = accessToken || (!cleared && envToken
    ? process.env.PLATFORM_MERCADOPAGO_ACCESS_TOKEN!.trim()
    : null);
  const effectivePublicKey = cleared
    ? null
    : row?.publicKey?.trim() ||
      process.env.PLATFORM_MERCADOPAGO_PUBLIC_KEY?.trim() ||
      null;

  return {
    billingEnabled: cleared ? false : (row?.billingEnabled ?? false),
    clientId: row?.clientId || process.env.MERCADOPAGO_CLIENT_ID?.trim() || null,
    hasClientSecret: Boolean(
      clientSecret || process.env.MERCADOPAGO_CLIENT_SECRET?.trim(),
    ),
    clientSecretMasked: maskSecret(
      clientSecret || process.env.MERCADOPAGO_CLIENT_SECRET?.trim() || null,
    ),
    hasAccessToken: Boolean(effectiveToken),
    accessTokenMasked: maskSecret(effectiveToken),
    publicKey: effectivePublicKey,
    userId: cleared ? null : row?.userId || null,
    nickname: cleared ? null : row?.nickname || null,
    connectedAt: cleared ? null : row?.connectedAt?.toISOString() || null,
    tokenExpiry: cleared ? null : row?.tokenExpiry?.toISOString() || null,
    lastError: row?.lastError || null,
    oauthAppReady: Boolean(app),
    connected: Boolean(effectiveToken && effectivePublicKey),
    fromEnvFallback: Boolean(
      !cleared && !accessToken && envToken && envPublicKey,
    ),
    redirectUriTenant:
      process.env.MERCADOPAGO_REDIRECT_URI?.trim() ||
      `${(process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "")}/api/mercadopago/callback`,
    redirectUriPlatform: getPlatformMercadoPagoRedirectUri(),
    webhookUrl: `${(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "").replace(/\/$/, "")}/api/webhooks/mercadopago-platform`,
  };
}

export async function savePlatformMpManualCredentials(input: {
  billingEnabled?: boolean;
  clientId?: string | null;
  clientSecret?: string | null;
  accessToken?: string | null;
  publicKey?: string | null;
}) {
  await ensurePlatformMpConfigRow();
  const data: {
    billingEnabled?: boolean;
    clientId?: string | null;
    clientSecretEncrypted?: string | null;
    accessTokenEncrypted?: string | null;
    publicKey?: string | null;
    connectedAt?: Date | null;
    lastError?: string | null;
  } = {};

  if (input.billingEnabled !== undefined) {
    data.billingEnabled = input.billingEnabled;
  }
  if (input.clientId !== undefined) {
    data.clientId = input.clientId?.trim() || null;
  }
  if (input.clientSecret?.trim()) {
    data.clientSecretEncrypted = encryptSecret(input.clientSecret.trim());
  }
  if (input.accessToken?.trim()) {
    data.accessTokenEncrypted = encryptSecret(input.accessToken.trim());
    data.connectedAt = new Date();
    data.lastError = null;
  }
  if (input.publicKey !== undefined) {
    data.publicKey = input.publicKey?.trim() || null;
    // Public key alone (with existing token) reconnects after a clear.
    if (input.publicKey?.trim() && !input.accessToken?.trim()) {
      const current = await getRow();
      if (isCredentialsCleared(current?.accessTokenEncrypted)) {
        // keep cleared until a real token is provided
      }
    }
  }

  return prisma.platformMercadoPagoConfig.update({
    where: { id: "singleton" },
    data,
  });
}

export async function savePlatformMpOAuthTokens(tokens: {
  accessToken: string;
  publicKey: string;
  refreshToken: string | null;
  userId: string | null;
  expiresAt: Date | null;
  nickname?: string | null;
}) {
  await ensurePlatformMpConfigRow();
  return prisma.platformMercadoPagoConfig.update({
    where: { id: "singleton" },
    data: {
      accessTokenEncrypted: encryptSecret(tokens.accessToken),
      publicKey:
        tokens.publicKey?.trim() ||
        process.env.PLATFORM_MERCADOPAGO_PUBLIC_KEY?.trim() ||
        null,
      refreshTokenEncrypted: tokens.refreshToken
        ? encryptSecret(tokens.refreshToken)
        : null,
      tokenExpiry: tokens.expiresAt,
      userId: tokens.userId,
      nickname: tokens.nickname ?? undefined,
      connectedAt: new Date(),
      lastError: null,
      billingEnabled: true,
    },
  });
}

export async function clearPlatformMpConnection() {
  await ensurePlatformMpConfigRow();
  return prisma.platformMercadoPagoConfig.update({
    where: { id: "singleton" },
    data: {
      accessTokenEncrypted: CLEARED_MARKER,
      publicKey: null,
      refreshTokenEncrypted: null,
      tokenExpiry: null,
      userId: null,
      nickname: null,
      connectedAt: null,
      lastError: null,
      billingEnabled: false,
    },
  });
}

export async function setPlatformMpLastError(message: string | null) {
  await ensurePlatformMpConfigRow();
  await prisma.platformMercadoPagoConfig.update({
    where: { id: "singleton" },
    data: { lastError: message },
  });
}

type OAuthTokenResponse = {
  access_token: string;
  public_key?: string;
  refresh_token?: string;
  user_id?: number | string;
  expires_in?: number;
  message?: string;
};

export async function exchangePlatformMercadoPagoCode(code: string) {
  const app = await getMpAppCredentials();
  if (!app) throw new Error("Client ID/Secret do Mercado Pago não configurados");

  const redirectUri = getPlatformMercadoPagoRedirectUri();
  const res = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: app.clientId,
      client_secret: app.clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  const data = (await res.json()) as OAuthTokenResponse & {
    error?: string;
    error_description?: string;
  };
  if (!res.ok) {
    throw new Error(
      data.message ||
        data.error_description ||
        data.error ||
        `Mercado Pago OAuth error ${res.status}`,
    );
  }

  const expiresIn = data.expires_in ?? 15552000;
  let nickname: string | null = null;
  try {
    const me = await fetch("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (me.ok) {
      const body = (await me.json()) as { nickname?: string };
      nickname = body.nickname || null;
    }
  } catch {
    /* ignore */
  }

  const publicKey =
    data.public_key?.trim() ||
    process.env.PLATFORM_MERCADOPAGO_PUBLIC_KEY?.trim() ||
    "";

  return {
    accessToken: data.access_token,
    publicKey,
    refreshToken: data.refresh_token || null,
    userId: data.user_id != null ? String(data.user_id) : null,
    expiresAt: addSeconds(new Date(), expiresIn),
    nickname,
  };
}

export async function getPlatformMercadoPagoAuthUrl(state: string) {
  const app = await getMpAppCredentials();
  if (!app) throw new Error("missing_env");
  const redirectUri = encodeURIComponent(getPlatformMercadoPagoRedirectUri());
  const scope = encodeURIComponent("offline_access read write");
  return (
    `https://auth.mercadopago.com/authorization` +
    `?client_id=${encodeURIComponent(app.clientId)}` +
    `&response_type=code` +
    `&platform_id=mp` +
    `&state=${encodeURIComponent(state)}` +
    `&redirect_uri=${redirectUri}` +
    `&scope=${scope}`
  );
}
