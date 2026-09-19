import { webhookUrl } from "@/lib/payments/resolve-provider";
import {
  messageFromMercadoPagoApiError,
  PaymentUserError,
} from "@/lib/payments/user-messages";

export type MercadoPagoPayer = {
  email: string;
  name: string;
  cpf?: string;
};

export type MercadoPagoPaymentResult = {
  id: string;
  status: string;
  statusDetail?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  demo?: boolean;
};

type MpPaymentResponse = {
  id: number;
  status: string;
  status_detail?: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
    };
  };
};

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return {
    first_name: parts[0] || fullName,
    last_name: parts.slice(1).join(" ") || parts[0] || fullName,
  };
}

function mpHeaders(accessToken: string, idempotencyKey: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "X-Idempotency-Key": idempotencyKey,
  };
}

function mapMpResponse(data: MpPaymentResponse): MercadoPagoPaymentResult {
  return {
    id: String(data.id),
    status: data.status,
    statusDetail: data.status_detail,
    qrCode: data.point_of_interaction?.transaction_data?.qr_code,
    qrCodeBase64: data.point_of_interaction?.transaction_data?.qr_code_base64,
  };
}

function throwMpApiError(
  data: MpPaymentResponse & {
    message?: string;
    cause?: Array<{
      code?: string | number;
      description?: string;
      message?: string;
    }>;
  },
  fallbackLabel: string,
): never {
  throw new PaymentUserError(
    messageFromMercadoPagoApiError(data) || fallbackLabel,
  );
}

export async function createMercadoPagoPixPayment(params: {
  accessToken: string;
  amountCents: number;
  description: string;
  payer: MercadoPagoPayer;
  bookingId: string;
  idempotencyKey: string;
}): Promise<MercadoPagoPaymentResult> {
  const { first_name, last_name } = splitName(params.payer.name);
  const cpf = (params.payer.cpf || "00000000000").replace(/\D/g, "");

  const res = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: mpHeaders(params.accessToken, params.idempotencyKey),
    body: JSON.stringify({
      transaction_amount: params.amountCents / 100,
      description: params.description,
      payment_method_id: "pix",
      external_reference: params.bookingId,
      notification_url: webhookUrl("/api/webhooks/mercadopago"),
      payer: {
        email: params.payer.email,
        first_name,
        last_name,
        identification: { type: "CPF", number: cpf },
      },
    }),
  });

  const data = (await res.json()) as MpPaymentResponse & {
    message?: string;
    cause?: Array<{
      code?: string | number;
      description?: string;
      message?: string;
    }>;
  };
  if (!res.ok) {
    throwMpApiError(data, "Não foi possível gerar o Pix. Tente novamente.");
  }
  return mapMpResponse(data);
}

export async function createMercadoPagoCardPayment(params: {
  accessToken: string;
  amountCents: number;
  description: string;
  payer: MercadoPagoPayer;
  cardToken: string;
  bookingId: string;
  idempotencyKey: string;
  installments?: number;
}): Promise<MercadoPagoPaymentResult> {
  const { first_name, last_name } = splitName(params.payer.name);
  const cpf = params.payer.cpf?.replace(/\D/g, "");
  if (!cpf) {
    throw new PaymentUserError("CPF obrigatório para pagamento com cartão");
  }

  const installments = Math.min(
    12,
    Math.max(1, Math.floor(params.installments || 1)),
  );

  const res = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: mpHeaders(params.accessToken, params.idempotencyKey),
    body: JSON.stringify({
      transaction_amount: params.amountCents / 100,
      token: params.cardToken,
      description: params.description,
      installments,
      external_reference: params.bookingId,
      notification_url: webhookUrl("/api/webhooks/mercadopago"),
      payer: {
        email: params.payer.email,
        first_name,
        last_name,
        identification: { type: "CPF", number: cpf },
      },
    }),
  });

  const data = (await res.json()) as MpPaymentResponse & {
    message?: string;
    cause?: Array<{
      code?: string | number;
      description?: string;
      message?: string;
    }>;
  };
  if (!res.ok) {
    throwMpApiError(
      data,
      "Não foi possível processar o cartão. Tente novamente.",
    );
  }
  return mapMpResponse(data);
}

export async function getMercadoPagoPayment(
  accessToken: string,
  paymentId: string,
) {
  const res = await fetch(
    `https://api.mercadopago.com/v1/payments/${paymentId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!res.ok) {
    throw new PaymentUserError(
      "Não foi possível consultar o status do pagamento. Atualize a página.",
    );
  }
  return (await res.json()) as MpPaymentResponse;
}

export function isMercadoPagoPaidStatus(status: string) {
  return ["approved", "authorized"].includes(status.toLowerCase());
}

export {
  isMercadoPagoRejectedStatus,
  mercadoPagoStatusMessage,
} from "@/lib/payments/user-messages";
