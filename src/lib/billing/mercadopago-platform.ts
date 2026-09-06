import { platformMercadoPagoConfigured } from "@/lib/billing/platform";

const MP_API = "https://api.mercadopago.com";

export async function pingPlatformMercadoPago() {
  const token = process.env.PLATFORM_MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) return { ok: false, error: "Token não configurado" };

  try {
    const res = await fetch(`${MP_API}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: body.slice(0, 200) || res.statusText };
    }
    const data = (await res.json()) as { id?: number; nickname?: string };
    return { ok: true, userId: data.id, nickname: data.nickname };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro de rede" };
  }
}

export async function createPlatformPreapproval(params: {
  reason: string;
  payerEmail: string;
  amountCents: number;
  backUrl: string;
  externalReference: string;
  frequencyMonths?: number;
}) {
  const token = process.env.PLATFORM_MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("PLATFORM_MERCADOPAGO_ACCESS_TOKEN ausente");

  const res = await fetch(`${MP_API}/preapproval`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reason: params.reason,
      payer_email: params.payerEmail,
      auto_recurring: {
        frequency: params.frequencyMonths ?? 1,
        frequency_type: "months",
        transaction_amount: params.amountCents / 100,
        currency_id: "BRL",
      },
      back_url: params.backUrl,
      external_reference: params.externalReference,
      status: "pending",
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Erro ao criar assinatura MP",
    );
  }

  return data as {
    id: string;
    init_point?: string;
    status?: string;
  };
}

/** Pagamento único (semestral) com parcelamento no cartão. */
export async function createPlatformPreference(params: {
  reason: string;
  payerEmail: string;
  amountCents: number;
  backUrl: string;
  externalReference: string;
  maxInstallments?: number;
}) {
  const token = process.env.PLATFORM_MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("PLATFORM_MERCADOPAGO_ACCESS_TOKEN ausente");

  const base = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    ""
  ).replace(/\/$/, "");

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [
        {
          title: params.reason,
          quantity: 1,
          currency_id: "BRL",
          unit_price: params.amountCents / 100,
        },
      ],
      payer: { email: params.payerEmail },
      external_reference: params.externalReference,
      back_urls: {
        success: params.backUrl,
        pending: params.backUrl,
        failure: params.backUrl,
      },
      auto_return: "approved",
      payment_methods: {
        installments: params.maxInstallments ?? 6,
      },
      ...(base
        ? {
            notification_url: `${base}/api/webhooks/mercadopago-platform`,
          }
        : {}),
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof data.message === "string"
        ? data.message
        : "Erro ao criar checkout MP",
    );
  }

  return data as {
    id: string;
    init_point?: string;
    sandbox_init_point?: string;
  };
}

export function platformMpPublicKey() {
  return process.env.PLATFORM_MERCADOPAGO_PUBLIC_KEY?.trim() || null;
}

export function platformBillingReady() {
  return platformMercadoPagoConfigured();
}

function platformNotificationUrl() {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    ""
  ).replace(/\/$/, "");
  return base ? `${base}/api/webhooks/mercadopago-platform` : undefined;
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return {
    first_name: parts[0] || fullName,
    last_name: parts.slice(1).join(" ") || parts[0] || fullName,
  };
}

type MpPaymentResponse = {
  id: number;
  status: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
    };
  };
};

/** Pix transparente (Checkout API) — assinatura da plataforma. */
export async function createPlatformPixPayment(params: {
  amountCents: number;
  description: string;
  payerEmail: string;
  payerName: string;
  organizationId: string;
  idempotencyKey: string;
}) {
  const token = process.env.PLATFORM_MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("PLATFORM_MERCADOPAGO_ACCESS_TOKEN ausente");

  const { first_name, last_name } = splitName(params.payerName);
  const notification_url = platformNotificationUrl();

  const res = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": params.idempotencyKey,
    },
    body: JSON.stringify({
      transaction_amount: params.amountCents / 100,
      description: params.description,
      payment_method_id: "pix",
      external_reference: params.organizationId,
      ...(notification_url ? { notification_url } : {}),
      payer: {
        email: params.payerEmail,
        first_name,
        last_name,
        identification: { type: "CPF", number: "00000000000" },
      },
    }),
  });

  const data = (await res.json()) as MpPaymentResponse & {
    message?: string;
  };
  if (!res.ok) {
    throw new Error(data.message || `Pix plataforma falhou (${res.status})`);
  }

  return {
    id: String(data.id),
    status: data.status,
    qrCode: data.point_of_interaction?.transaction_data?.qr_code,
    qrCodeBase64: data.point_of_interaction?.transaction_data?.qr_code_base64,
  };
}

/** Cartão transparente (token do SDK) — assinatura da plataforma. */
export async function createPlatformCardPayment(params: {
  amountCents: number;
  description: string;
  payerEmail: string;
  payerName: string;
  cpf: string;
  cardToken: string;
  organizationId: string;
  idempotencyKey: string;
  installments?: number;
}) {
  const token = process.env.PLATFORM_MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("PLATFORM_MERCADOPAGO_ACCESS_TOKEN ausente");

  const cpf = params.cpf.replace(/\D/g, "");
  if (cpf.length !== 11) throw new Error("CPF inválido");

  const { first_name, last_name } = splitName(params.payerName);
  const installments = Math.min(
    12,
    Math.max(1, Math.floor(params.installments || 1)),
  );
  const notification_url = platformNotificationUrl();

  const res = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": params.idempotencyKey,
    },
    body: JSON.stringify({
      transaction_amount: params.amountCents / 100,
      token: params.cardToken,
      description: params.description,
      installments,
      external_reference: params.organizationId,
      ...(notification_url ? { notification_url } : {}),
      payer: {
        email: params.payerEmail,
        first_name,
        last_name,
        identification: { type: "CPF", number: cpf },
      },
    }),
  });

  const data = (await res.json()) as MpPaymentResponse & {
    message?: string;
  };
  if (!res.ok) {
    throw new Error(data.message || `Cartão plataforma falhou (${res.status})`);
  }

  return {
    id: String(data.id),
    status: data.status,
  };
}

export async function getPlatformPayment(paymentId: string) {
  const token = process.env.PLATFORM_MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("PLATFORM_MERCADOPAGO_ACCESS_TOKEN ausente");

  const res = await fetch(
    `https://api.mercadopago.com/v1/payments/${paymentId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`Pagamento MP ${res.status}`);
  return (await res.json()) as {
    id: number;
    status: string;
    external_reference?: string;
    transaction_amount?: number;
  };
}

