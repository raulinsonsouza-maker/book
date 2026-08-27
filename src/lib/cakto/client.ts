type TokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

type CaktoCredentials = {
  clientId: string;
  clientSecret: string;
};

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

export async function getCaktoToken(creds: CaktoCredentials) {
  const cached = tokenCache.get(creds.clientId);
  if (cached && cached.expiresAt > Date.now() + 30_000) {
    return cached.token;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
  });

  const res = await fetch("https://api.cakto.com.br/public_api/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cakto auth failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as TokenResponse;
  tokenCache.set(creds.clientId, {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  });
  return data.access_token;
}

export type CaktoCustomer = {
  name: string;
  email: string;
  phone: string;
  fingerprint: string;
  docType: "cpf";
  docNumber: string;
};

export type CreatePixParams = {
  creds: CaktoCredentials;
  offerId: string;
  customer: CaktoCustomer;
  idempotencyKey: string;
  pixExpiresIn?: number;
  metadata?: Record<string, string>;
};

export type CreateCardParams = {
  creds: CaktoCredentials;
  offerId: string;
  customer: CaktoCustomer;
  cardToken: string;
  idempotencyKey: string;
  metadata?: Record<string, string>;
};

export async function createPixPayment(params: CreatePixParams) {
  const token = await getCaktoToken(params.creds);
  const res = await fetch("https://api.cakto.com.br/public_api/payments/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": params.idempotencyKey,
    },
    body: JSON.stringify({
      paymentMethod: "pix",
      customer: params.customer,
      items: [
        { offerId: params.offerId, quantity: 1, offerType: "main" },
      ],
      pixExpiresIn: params.pixExpiresIn ?? 3600,
      metadata: params.metadata,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof data === "object"
        ? JSON.stringify(data)
        : `Cakto Pix error ${res.status}`,
    );
  }
  return data as {
    id: string;
    status: string;
    qrCode?: string;
    qrCodeBase64?: string;
    pixExpiresIn?: number;
  };
}

export async function createCardPayment(params: CreateCardParams) {
  const token = await getCaktoToken(params.creds);
  const res = await fetch("https://api.cakto.com.br/public_api/payments/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": params.idempotencyKey,
    },
    body: JSON.stringify({
      paymentMethod: "credit_card",
      cardToken: params.cardToken,
      customer: params.customer,
      items: [
        { offerId: params.offerId, quantity: 1, offerType: "main" },
      ],
      metadata: params.metadata,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof data === "object"
        ? JSON.stringify(data)
        : `Cakto card error ${res.status}`,
    );
  }
  return data as {
    id: string;
    status: string;
    threeDS?: unknown;
  };
}

/** Demo mode when org has no Cakto credentials — simulates Pix QR */
export function createDemoPixPayment(idempotencyKey: string) {
  const payload = `00020126580014br.gov.bcb.pix0136${idempotencyKey}5204000053039865802BR5913Book Symbius6009SAO PAULO62070503***6304ABCD`;
  return {
    id: `demo_${idempotencyKey}`,
    status: "pending",
    qrCode: payload,
    qrCodeBase64: "",
    demo: true as const,
  };
}

export function createDemoCardPayment(idempotencyKey: string) {
  return {
    id: `demo_card_${idempotencyKey}`,
    status: "paid",
    demo: true as const,
  };
}
