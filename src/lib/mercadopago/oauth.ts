import { addSeconds } from "date-fns";
import { prisma } from "@/lib/prisma";
import { CAKTO_ENABLED } from "@/lib/feature-flags";

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

export function mercadoPagoOAuthConfigured() {
  return Boolean(
    process.env.MERCADOPAGO_CLIENT_ID?.trim() &&
      process.env.MERCADOPAGO_CLIENT_SECRET?.trim(),
  );
}

export function getMercadoPagoRedirectUri() {
  const configured = process.env.MERCADOPAGO_REDIRECT_URI?.trim();
  if (configured) return configured;
  const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/mercadopago/callback`;
}

export function getMercadoPagoAuthUrl(state: string) {
  const clientId = process.env.MERCADOPAGO_CLIENT_ID!;
  const redirectUri = encodeURIComponent(getMercadoPagoRedirectUri());
  const scope = encodeURIComponent("offline_access read write");
  return (
    `https://auth.mercadopago.com/authorization` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&response_type=code` +
    `&platform_id=mp` +
    `&state=${encodeURIComponent(state)}` +
    `&redirect_uri=${redirectUri}` +
    `&scope=${scope}`
  );
}

async function postOAuthToken(body: Record<string, string>) {
  const res = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.MERCADOPAGO_CLIENT_ID,
      client_secret: process.env.MERCADOPAGO_CLIENT_SECRET,
      ...body,
    }),
  });

  const data = (await res.json()) as OAuthTokenResponse;
  if (!res.ok) {
    throw new Error(data.message || `Mercado Pago OAuth error ${res.status}`);
  }

  const expiresIn = data.expires_in ?? 15552000;
  return {
    accessToken: data.access_token,
    publicKey: data.public_key || "",
    refreshToken: data.refresh_token || null,
    userId: data.user_id != null ? String(data.user_id) : null,
    expiresAt: addSeconds(new Date(), expiresIn),
  } satisfies MercadoPagoOAuthTokens;
}

export async function exchangeMercadoPagoCode(code: string) {
  return postOAuthToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: getMercadoPagoRedirectUri(),
  });
}

export async function refreshMercadoPagoToken(refreshToken: string) {
  return postOAuthToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
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
    },
  });

  const switchToCakto =
    CAKTO_ENABLED &&
    org?.paymentProvider === "MERCADO_PAGO" &&
    Boolean(org.caktoClientId && org.caktoClientSecret && org.caktoOfferId);

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      mercadoPagoAccessToken: null,
      mercadoPagoPublicKey: null,
      mercadoPagoRefreshToken: null,
      mercadoPagoTokenExpiry: null,
      mercadoPagoUserId: null,
      mercadoPagoConnectedAt: null,
      ...(switchToCakto ? { paymentProvider: "CAKTO" } : {}),
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

  if (!mercadoPagoOAuthConfigured()) {
    return org.mercadoPagoAccessToken;
  }

  const tokens = await refreshMercadoPagoToken(org.mercadoPagoRefreshToken);
  await saveMercadoPagoTokens(organizationId, tokens);
  return tokens.accessToken;
}
