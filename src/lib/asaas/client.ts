import { webhookUrl } from "@/lib/payments/resolve-provider";

export type AsaasPayer = {
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
};

export type AsaasCreditCard = {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
};

export type AsaasPaymentResult = {
  id: string;
  status: string;
  qrCode?: string;
  qrCodeBase64?: string;
  demo?: boolean;
};

type AsaasErrorBody = {
  errors?: Array<{ code?: string; description?: string }>;
};

function asaasBaseUrl(apiKey: string) {
  const configured = process.env.ASAAS_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (apiKey.includes("_hmlg_") || apiKey.includes("sandbox")) {
    return "https://api-sandbox.asaas.com/v3";
  }
  return "https://api.asaas.com/v3";
}

function asaasHeaders(apiKey: string) {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "BookSymbius/1.0",
    access_token: apiKey,
  };
}

async function asaasFetch<T>(
  apiKey: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${asaasBaseUrl(apiKey)}${path}`, {
    ...init,
    headers: {
      ...asaasHeaders(apiKey),
      ...(init?.headers || {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as T & AsaasErrorBody;
  if (!res.ok) {
    const msg =
      data.errors?.map((e) => e.description).filter(Boolean).join("; ") ||
      `Asaas error ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export function isAsaasPaidStatus(status: string) {
  const s = String(status).toUpperCase();
  return s === "RECEIVED" || s === "CONFIRMED";
}

export async function validateAsaasApiKey(apiKey: string) {
  const account = await asaasFetch<{
    email?: string;
    name?: string;
    walletId?: string;
  }>(apiKey, "/myAccount");
  return {
    email: account.email || null,
    name: account.name || null,
    walletId: account.walletId || null,
  };
}

async function findOrCreateCustomer(apiKey: string, payer: AsaasPayer) {
  const cpfCnpj = (payer.cpf || "").replace(/\D/g, "");
  if (!cpfCnpj) {
    throw new Error("CPF obrigatório para pagamentos Asaas");
  }

  const existing = await asaasFetch<{
    data?: Array<{ id: string }>;
  }>(apiKey, `/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}&limit=1`);

  if (existing.data?.[0]?.id) {
    return existing.data[0].id;
  }

  const phone = (payer.phone || "").replace(/\D/g, "");
  const created = await asaasFetch<{ id: string }>(apiKey, "/customers", {
    method: "POST",
    body: JSON.stringify({
      name: payer.name,
      email: payer.email,
      cpfCnpj,
      mobilePhone: phone || undefined,
      notificationDisabled: true,
    }),
  });
  return created.id;
}

function dueDateIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export async function createAsaasPixPayment(params: {
  apiKey: string;
  amountCents: number;
  description: string;
  payer: AsaasPayer;
  externalReference: string;
}): Promise<AsaasPaymentResult> {
  const customerId = await findOrCreateCustomer(params.apiKey, params.payer);
  const payment = await asaasFetch<{ id: string; status: string }>(
    params.apiKey,
    "/payments",
    {
      method: "POST",
      body: JSON.stringify({
        customer: customerId,
        billingType: "PIX",
        value: params.amountCents / 100,
        dueDate: dueDateIso(),
        description: params.description.slice(0, 500),
        externalReference: params.externalReference,
      }),
    },
  );

  const qr = await asaasFetch<{
    encodedImage?: string;
    payload?: string;
  }>(params.apiKey, `/payments/${payment.id}/pixQrCode`);

  return {
    id: payment.id,
    status: payment.status,
    qrCode: qr.payload,
    qrCodeBase64: qr.encodedImage,
  };
}

export async function createAsaasCardPayment(params: {
  apiKey: string;
  amountCents: number;
  description: string;
  payer: AsaasPayer;
  creditCard: AsaasCreditCard;
  externalReference: string;
  remoteIp?: string;
}): Promise<AsaasPaymentResult> {
  const customerId = await findOrCreateCustomer(params.apiKey, params.payer);
  const cpf = (params.payer.cpf || "").replace(/\D/g, "");
  const phone = (params.payer.phone || "").replace(/\D/g, "") || "11999999999";
  const expYear =
    params.creditCard.expiryYear.length === 2
      ? `20${params.creditCard.expiryYear}`
      : params.creditCard.expiryYear;

  const payment = await asaasFetch<{ id: string; status: string }>(
    params.apiKey,
    "/payments",
    {
      method: "POST",
      body: JSON.stringify({
        customer: customerId,
        billingType: "CREDIT_CARD",
        value: params.amountCents / 100,
        dueDate: dueDateIso(),
        description: params.description.slice(0, 500),
        externalReference: params.externalReference,
        remoteIp: params.remoteIp || "127.0.0.1",
        creditCard: {
          holderName: params.creditCard.holderName,
          number: params.creditCard.number.replace(/\D/g, ""),
          expiryMonth: params.creditCard.expiryMonth.padStart(2, "0"),
          expiryYear: expYear,
          ccv: params.creditCard.ccv,
        },
        creditCardHolderInfo: {
          name: params.payer.name,
          email: params.payer.email,
          cpfCnpj: cpf,
          postalCode: "01310100",
          addressNumber: "100",
          phone,
          mobilePhone: phone,
        },
      }),
    },
  );

  return {
    id: payment.id,
    status: payment.status,
  };
}

export async function getAsaasPayment(apiKey: string, paymentId: string) {
  return asaasFetch<{ id: string; status: string; externalReference?: string }>(
    apiKey,
    `/payments/${paymentId}`,
  );
}

export async function ensureAsaasWebhook(params: {
  apiKey: string;
  authToken: string;
  email?: string | null;
}) {
  const url = webhookUrl("/api/webhooks/asaas");
  const list = await asaasFetch<{
    data?: Array<{ id: string; url?: string }>;
  }>(params.apiKey, "/webhooks");

  const existing = list.data?.find((w) => w.url === url);
  if (existing) return existing.id;

  const created = await asaasFetch<{ id: string }>(params.apiKey, "/webhooks", {
    method: "POST",
    body: JSON.stringify({
      name: "Book Symbius",
      url,
      email: params.email || "contato@symbius.com.br",
      enabled: true,
      interrupted: false,
      apiVersion: 3,
      authToken: params.authToken,
      sendType: "SEQUENTIALLY",
      events: [
        "PAYMENT_CONFIRMED",
        "PAYMENT_RECEIVED",
        "PAYMENT_OVERDUE",
        "PAYMENT_DELETED",
        "PAYMENT_REFUNDED",
      ],
    }),
  });
  return created.id;
}

export function parseAsaasCardToken(cardToken: string): AsaasCreditCard | null {
  if (!cardToken.startsWith("asaas_card:")) return null;
  try {
    const raw = JSON.parse(cardToken.slice("asaas_card:".length)) as AsaasCreditCard;
    if (!raw.holderName || !raw.number || !raw.ccv) return null;
    return raw;
  } catch {
    return null;
  }
}

export function encodeAsaasCardToken(card: AsaasCreditCard) {
  return `asaas_card:${JSON.stringify(card)}`;
}
