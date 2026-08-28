import type { Organization, PaymentProvider } from "@prisma/client";

export type ResolvedPaymentProvider = PaymentProvider | "DEMO";

type OrgPaymentConfig = Pick<
  Organization,
  | "paymentProvider"
  | "caktoClientId"
  | "caktoClientSecret"
  | "caktoOfferId"
  | "mercadoPagoAccessToken"
  | "mercadoPagoPublicKey"
>;

export function isCaktoReady(org: Pick<Organization, "caktoClientId" | "caktoClientSecret" | "caktoOfferId">) {
  return Boolean(org.caktoClientId && org.caktoClientSecret && org.caktoOfferId);
}

export function isMercadoPagoReady(
  org: Pick<Organization, "mercadoPagoAccessToken" | "mercadoPagoPublicKey">,
) {
  return Boolean(org.mercadoPagoAccessToken && org.mercadoPagoPublicKey);
}

export function resolvePaymentProvider(org: OrgPaymentConfig): ResolvedPaymentProvider {
  if (org.paymentProvider === "MERCADO_PAGO" && isMercadoPagoReady(org)) {
    return "MERCADO_PAGO";
  }
  if (org.paymentProvider === "CAKTO" && isCaktoReady(org)) {
    return "CAKTO";
  }
  if (isMercadoPagoReady(org)) return "MERCADO_PAGO";
  if (isCaktoReady(org)) return "CAKTO";
  return "DEMO";
}

export function paymentProviderLabel(provider: ResolvedPaymentProvider) {
  if (provider === "MERCADO_PAGO") return "Mercado Pago";
  if (provider === "CAKTO") return "Cakto";
  return "Demo";
}

export function webhookUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}
