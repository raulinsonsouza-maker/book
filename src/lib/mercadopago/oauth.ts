import { addSeconds } from "date-fns";
import { prisma } from "@/lib/prisma";
import { ASAAS_ENABLED, CAKTO_ENABLED } from "@/lib/feature-flags";
import {
  getMpAppCredentials,
  type MpAppCredentials,
} from "@/lib/billing/platform-mercadopago-config";
import { TEMARK_APP_HOST, isTemarkHost } from "@/lib/app-origin";

export type MercadoPagoOAuthBrand = "book" | "temark";

export type MercadoPagoOAuthTokens = {
  accessToken: string;
  publicKey: string;
  refreshToken: string | null;
  userId: string | null;
  expiresAt: Date | null;
};

type OAuthTokenResponse = {
  access_token: string;
  public_key?: string;
  refresh_token?: string;
  user_id?: number | string;
  expires_in?: number;
  live_mode?: boolean;
  message?: string;
};

export function mercadoPagoBrandFromOrigin(
  origin?: string | null,
): MercadoPagoOAuthBrand {
  if (!origin) return "book";
  try {
    return isTemarkHost(new URL(origin).hostname) ? "temark" : "book";
  } catch {
    return "book";
  }
}

function getTemarkMpAppCredentials(): MpAppCredentials | null {
  const clientId = process.env.TEMARK_MERCADOPAGO_CLIENT_ID?.trim() || "";
  const clientSecret =
    process.env.TEMARK_MERCADOPAGO_CLIENT_SECRET?.trim() || "";
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export async function getMercadoPagoAppCredentials(
  brand: MercadoPagoOAuthBrand = "book",
): Promise<MpAppCredentials | null> {
  if (brand === "temark") {
    return getTemarkMpAppCredentials() || getMpAppCredentials();
  }
  return getMpAppCredentials();
}

export async function mercadoPagoOAuthConfigured(
  brand: MercadoPagoOAuthBrand = "book",
) {
  return Boolean(await getMercadoPagoAppCredentials(brand));
}

/**
 * URI cadastrada no app do Mercado Pago (uma por app).
 * Temark e Book usam apps distintos quando TEMARK_MERCADOPAGO_* está no env.
 */
export function getMercadoPagoRedirectUri(
  brand: MercadoPagoOAuthBrand = "book",
) {
  if (brand === "temark") {
    const temark =
      process.env.TEMARK_MERCADOPAGO_REDIRECT_URI?.trim() ||
      `https://${TEMARK_APP_HOST}/api/mercadopago/callback`;
    if (getTemarkMpAppCredentials()) return temark;
  }
  const configured = process.env.MERCADOPAGO_REDIRECT_URI?.trim();
  if (configured) return configured;
  const base =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/mercadopago/callback`;
}

export async function getMercadoPagoAuthUrl(
  state: string,
  brand: MercadoPagoOAuthBrand = "book",
) {
  const app = await getMercadoPagoAppCredentials(brand);
  if (!app) throw new Error("Mercado Pago OAuth não configurado");
  const redirectUri = encodeURIComponent(getMercadoPagoRedirectUri(brand));
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

async function postOAuthToken(
  body: Record<string, string>,
  brand: MercadoPagoOAuthBrand = "book",
) {
  const preferred = await getMercadoPagoAppCredentials(brand);
  const fallback =
    brand === "temark"
      ? await getMpAppCredentials()
      : getTemarkMpAppCredentials();
  const candidates = [preferred, fallback].filter(
    (c, i, arr): c is MpAppCredentials =>
      Boolean(c) && arr.findIndex((x) => x?.clientId === c!.clientId) === i,
  );
  if (candidates.length === 0) {
    throw new Error("Mercado Pago OAuth não configurado");
  }

  let lastError: Error | null = null;
  for (const app of candidates) {
    const res = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: app.clientId,
        client_secret: app.clientSecret,
        ...body,
      }),
    });

    const data = (await res.json()) as OAuthTokenResponse;
    if (res.ok) {
      const expiresIn = data.expires_in ?? 15552000;
      return {
        accessToken: data.access_token,
        publicKey: data.public_key || "",
        refreshToken: data.refresh_token || null,
        userId: data.user_id != null ? String(data.user_id) : null,
        expiresAt: addSeconds(new Date(), expiresIn),
      } satisfies MercadoPagoOAuthTokens;
    }
    lastError = new Error(
      data.message || `Mercado Pago OAuth error ${res.status}`,
    );
  }

  throw lastError || new Error("Mercado Pago OAuth error");
}

export async function exchangeMercadoPagoCode(
  code: string,
  brand: MercadoPagoOAuthBrand = "book",
) {
  return postOAuthToken(
    {
      grant_type: "authorization_code",
      code,
      redirect_uri: getMercadoPagoRedirectUri(brand),
    },
    brand,
  );
}

export async function refreshMercadoPagoToken(
  refreshToken: string,
  brand: MercadoPagoOAuthBrand = "book",
) {
  return postOAuthToken(
    {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    },
    brand,
  );
}

export async function saveMercadoPagoTokens(
  organizationId: string,
  tokens: MercadoPagoOAuthTokens,
) {
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      paymentProvider: "MERCADO_PAGO",
      mercadoPagoAccessToken: tokens.accessToken,
      mercadoPagoPublicKey: tokens.publicKey || undefined,
      mercadoPagoRefreshToken: tokens.refreshToken,
      mercadoPagoTokenExpiry: tokens.expiresAt,
      mercadoPagoUserId: tokens.userId,
      mercadoPagoConnectedAt: new Date(),
    },
  });
}

export async function clearMercadoPagoConnection(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      paymentProvider: true,
      caktoClientId: true,
      caktoClientSecret: true,
      caktoOfferId: true,
      asaasApiKey: true,
    },
  });

  const wasDefault = org?.paymentProvider === "MERCADO_PAGO";
  const switchToAsaas =
    wasDefault && ASAAS_ENABLED && Boolean(org?.asaasApiKey?.trim());
  const switchToCakto =
    wasDefault &&
    !switchToAsaas &&
    CAKTO_ENABLED &&
    Boolean(org?.caktoClientId && org.caktoClientSecret && org.caktoOfferId);

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      mercadoPagoAccessToken: null,
      mercadoPagoPublicKey: null,
      mercadoPagoRefreshToken: null,
      mercadoPagoTokenExpiry: null,
      mercadoPagoUserId: null,
      mercadoPagoConnectedAt: null,
      ...(switchToAsaas
        ? { paymentProvider: "ASAAS" as const }
        : switchToCakto
          ? { paymentProvider: "CAKTO" as const }
          : {}),
    },
  });
}

/** Renova o token se estiver perto de expirar (7 dias). */
export async function ensureMercadoPagoAccessToken(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      mercadoPagoAccessToken: true,
      mercadoPagoRefreshToken: true,
      mercadoPagoTokenExpiry: true,
    },
  });

  if (!org?.mercadoPagoAccessToken) {
    return null;
  }

  const expiry = org.mercadoPagoTokenExpiry?.getTime() ?? 0;
  const renewThreshold = Date.now() + 7 * 24 * 60 * 60 * 1000;

  if (expiry > renewThreshold || !org.mercadoPagoRefreshToken) {
    return org.mercadoPagoAccessToken;
  }

  if (!(await mercadoPagoOAuthConfigured("book")) &&
      !(await mercadoPagoOAuthConfigured("temark"))) {
    return org.mercadoPagoAccessToken;
  }

  const tokens = await refreshMercadoPagoToken(org.mercadoPagoRefreshToken);
  await saveMercadoPagoTokens(organizationId, tokens);
  return tokens.accessToken;
}
