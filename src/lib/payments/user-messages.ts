/**
 * Mensagens de pagamento voltadas ao cliente final.
 * Centraliza status_detail do Mercado Pago, status Asaas e erros de API/SDK.
 */

export class PaymentUserError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "PaymentUserError";
    this.code = code;
  }
}

const MP_STATUS_DETAIL: Record<string, string> = {
  // Dados preenchidos errado
  cc_rejected_bad_filled_card_number:
    "Número do cartão inválido. Confira e tente de novo.",
  cc_rejected_bad_filled_date:
    "Data de validade do cartão inválida. Confira mês e ano.",
  cc_rejected_bad_filled_security_code:
    "Código de segurança (CVV) inválido. Confira e tente de novo.",
  cc_rejected_bad_filled_other:
    "Dados do cartão incorretos. Confira e tente de novo.",

  // Banco emissor
  cc_rejected_insufficient_amount:
    "Cartão sem limite ou saldo insuficiente. Tente outro cartão ou Pix.",
  cc_rejected_call_for_authorize:
    "Pagamento não autorizado pelo banco. Ligue para o banco ou use outro cartão/Pix.",
  cc_rejected_card_disabled:
    "Cartão desabilitado para compras online. Ative no banco ou use outro cartão/Pix.",
  cc_rejected_duplicated_payment:
    "Pagamento duplicado detectado. Se já pagou, aguarde a confirmação; senão, tente Pix.",
  cc_rejected_invalid_installments:
    "Número de parcelas não permitido para este cartão. Escolha menos parcelas ou Pix.",
  cc_rejected_max_attempts:
    "Muitas tentativas com este cartão. Aguarde um pouco ou use outro cartão/Pix.",
  cc_rejected_card_error:
    "O banco não processou este cartão. Tente outro cartão ou Pix.",
  cc_rejected_time_out:
    "O banco demorou para responder. Tente novamente em instantes ou use Pix.",

  // Fraude / risco
  cc_rejected_blacklist:
    "Este cartão não pode ser usado nesta compra. Tente outro cartão ou Pix.",
  cc_rejected_high_risk:
    "Pagamento recusado por segurança. Tente outro cartão ou Pix.",
  cc_rejected_other_reason:
    "Cartão recusado pelo banco. Tente outro cartão ou Pix.",

  // 3DS
  cc_rejected_3ds_challenge:
    "A verificação extra do cartão (3DS) não foi concluída. Tente de novo ou use Pix.",
  cc_rejected_3ds_mandatory:
    "Este cartão exige verificação extra que não está disponível. Use outro cartão ou Pix.",

  // Outros
  bank_error:
    "Erro no banco ao processar o pagamento. Tente novamente ou use Pix.",
  rejected_by_bank:
    "Pagamento recusado pelo banco. Tente outro meio de pagamento.",
  rejected_by_regulations:
    "Pagamento bloqueado por regras do banco. Tente outro cartão ou Pix.",
  cc_amount_rate_limit_exceeded:
    "Limite de tentativas atingido. Aguarde e tente de novo, ou use Pix.",
  insufficient_amount:
    "Saldo ou limite insuficiente. Tente outro cartão ou Pix.",
};

/** Códigos comuns de erro da API MP (campo cause[].code). */
const MP_API_CAUSE: Record<string, string> = {
  "2067": "CPF inválido. Confira o CPF informado.",
  "2061": "E-mail do pagador inválido.",
  "2034": "Número do cartão inválido.",
  "2051": "Data de validade inválida.",
  "2054": "Código de segurança (CVV) inválido.",
  "2059": "Nome no cartão inválido.",
  "2089": "O token do cartão expirou. Preencha os dados novamente.",
  "2090": "Não foi possível processar o cartão. Tente de novo.",
  "2092": "Parcelas inválidas para este cartão.",
  "3000": "Não encontramos o token do cartão. Preencha os dados novamente.",
  "3020": "Valor da compra inválido.",
  "3230": "CPF do titular inválido.",
  "3245": "Pagamento recusado. Tente outro cartão ou Pix.",
  "4030": "Conta Mercado Pago do vendedor sem permissão para receber cartão.",
};

const ASAAS_STATUS: Record<string, string> = {
  REFUSED: "Pagamento com cartão recusado. Tente outro cartão ou Pix.",
  REPROVED: "Pagamento com cartão reprovado. Tente outro cartão ou Pix.",
  CHARGEBACK_REQUESTED:
    "Pagamento em contestação. Entre em contato com o estabelecimento.",
  CHARGEBACK_DISPUTE:
    "Pagamento em disputa. Entre em contato com o estabelecimento.",
  AWAITING_CHARGEBACK_REVERSAL:
    "Pagamento em análise de estorno. Aguarde ou fale com o estabelecimento.",
  DUNNING_REQUESTED:
    "Não foi possível confirmar o cartão. Tente outro cartão ou Pix.",
};

const ASAAS_ERROR_SNIPPETS: Array<{ match: RegExp; message: string }> = [
  {
    match: /cpf|cnpj/i,
    message: "CPF inválido ou não aceito. Confira o CPF e tente de novo.",
  },
  {
    match: /credit.?card|cart[aã]o/i,
    message: "Dados do cartão inválidos. Confira e tente de novo.",
  },
  {
    match: /insufficient|saldo|limite/i,
    message: "Cartão sem limite ou saldo insuficiente. Tente outro cartão ou Pix.",
  },
  {
    match: /expired|expirad|validade/i,
    message: "Cartão vencido ou data inválida. Confira a validade.",
  },
  {
    match: /security.?code|cvv|ccv/i,
    message: "Código de segurança (CVV) inválido.",
  },
  {
    match: /installment|parcela/i,
    message: "Parcelas não permitidas para este cartão. Escolha menos parcelas ou Pix.",
  },
  {
    match: /customer|cliente/i,
    message: "Não foi possível registrar seus dados. Confira nome, e-mail e CPF.",
  },
  {
    match: /unauthorized|forbidden|access.?token|api.?key/i,
    message: "Pagamento temporariamente indisponível. Tente Pix ou volte mais tarde.",
  },
];

export function mercadoPagoStatusMessage(statusDetail?: string | null): string {
  if (!statusDetail) {
    return "Pagamento com cartão recusado. Tente outro cartão ou Pix.";
  }
  const key = statusDetail.trim();
  return (
    MP_STATUS_DETAIL[key] ||
    `Pagamento recusado. Tente outro cartão ou Pix.`
  );
}

export function isMercadoPagoRejectedStatus(status: string) {
  return String(status).toLowerCase() === "rejected";
}

export function isAsaasRefusedStatus(status: string) {
  const s = String(status).toUpperCase();
  return (
    s === "REFUSED" ||
    s === "REPROVED" ||
    Boolean(ASAAS_STATUS[s] && s.startsWith("CHARGEBACK")) ||
    s === "DUNNING_REQUESTED"
  );
}

export function asaasStatusMessage(
  status?: string | null,
  refuseReason?: string | null,
): string {
  if (refuseReason?.trim()) {
    const mapped = mapAsaasRawError(refuseReason);
    if (mapped) return mapped;
  }
  const s = String(status || "").toUpperCase();
  return (
    ASAAS_STATUS[s] ||
    "Pagamento com cartão recusado. Tente outro cartão ou Pix."
  );
}

function mapAsaasRawError(raw: string): string | null {
  for (const rule of ASAAS_ERROR_SNIPPETS) {
    if (rule.match.test(raw)) return rule.message;
  }
  // Evita vazar JSON / códigos internos
  if (raw.length < 160 && !/[{\[\]}]/.test(raw) && !/error\s*\d/i.test(raw)) {
    return raw;
  }
  return null;
}

/** Converte erro bruto da API/SDK em mensagem segura para o cliente. */
export function toPaymentUserMessage(err: unknown): string {
  if (err instanceof PaymentUserError) return err.message;

  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "";

  if (!raw) {
    return "Não foi possível processar o pagamento. Tente novamente ou use Pix.";
  }

  // Já é mensagem nossa
  if (
    raw.includes("Tente outro") ||
    raw.includes("Confira") ||
    raw.includes("CPF obrigatório") ||
    raw.includes("inválido")
  ) {
    return raw;
  }

  // MP status_detail embutido
  const detailMatch = raw.match(/cc_rejected_[\w]+|bank_error|insufficient_amount/);
  if (detailMatch) return mercadoPagoStatusMessage(detailMatch[0]);

  // MP cause code
  const causeCode = raw.match(/\b(20\d{2}|30\d{2}|32\d{2}|40\d{2})\b/);
  if (causeCode && MP_API_CAUSE[causeCode[1]]) {
    return MP_API_CAUSE[causeCode[1]];
  }

  const asaas = mapAsaasRawError(raw);
  if (asaas) return asaas;

  if (/Hold expirado|expirado/i.test(raw)) {
    return "O tempo para pagar acabou. Atualize a página e tente novamente.";
  }
  if (/CPF/i.test(raw)) {
    return "CPF obrigatório ou inválido para pagar com cartão.";
  }
  if (/token/i.test(raw)) {
    return "Não foi possível validar o cartão. Preencha os dados novamente.";
  }
  if (/network|fetch|timeout|ECONN|Failed to fetch/i.test(raw)) {
    return "Falha de conexão ao processar o pagamento. Tente novamente.";
  }

  return "Não foi possível processar o pagamento. Tente outro cartão ou Pix.";
}

/**
 * Interpreta erro de resposta HTTP do Mercado Pago (body JSON).
 */
export function messageFromMercadoPagoApiError(data: {
  message?: string;
  status_detail?: string;
  cause?: Array<{ code?: string | number; description?: string; message?: string }>;
}): string {
  if (data.status_detail) return mercadoPagoStatusMessage(data.status_detail);

  const cause = data.cause?.[0];
  if (cause?.code != null) {
    const code = String(cause.code);
    if (MP_API_CAUSE[code]) return MP_API_CAUSE[code];
  }
  if (cause?.description) {
    const mapped = mapAsaasRawError(cause.description);
    if (mapped) return mapped;
  }

  if (data.message && data.message.length < 120 && !/[{[]/.test(data.message)) {
    // Mensagens curtas do MP às vezes são ok; ainda assim preferimos genérico se técnica
    if (/invalid|error|null|undefined/i.test(data.message)) {
      return "Não foi possível processar o pagamento. Confira os dados ou use Pix.";
    }
  }

  return "Não foi possível processar o pagamento no Mercado Pago. Tente outro cartão ou Pix.";
}

export function messageFromAsaasApiErrors(
  errors?: Array<{ code?: string; description?: string }>,
): string {
  const desc = errors?.map((e) => e.description).filter(Boolean).join("; ");
  if (!desc) {
    return "Não foi possível processar o pagamento. Tente novamente ou use Pix.";
  }
  return mapAsaasRawError(desc) || toPaymentUserMessage(desc);
}

export type CardPaymentOutcome =
  | { kind: "paid" }
  | { kind: "rejected"; message: string }
  | { kind: "pending"; message: string };

export function resolveCardPaymentOutcome(
  provider: string,
  result: {
    status: string;
    statusDetail?: string | null;
    refuseReason?: string | null;
    demo?: boolean;
  },
): CardPaymentOutcome {
  if (result.demo) return { kind: "paid" };

  const status = String(result.status || "");

  if (provider === "MERCADO_PAGO") {
    const s = status.toLowerCase();
    if (s === "approved" || s === "authorized") return { kind: "paid" };
    if (s === "rejected" || s === "cancelled") {
      return {
        kind: "rejected",
        message: mercadoPagoStatusMessage(result.statusDetail),
      };
    }
    // in_process / pending / in_mediation
    return {
      kind: "pending",
      message:
        s === "in_process"
          ? "Pagamento em análise pelo banco. A tela atualiza sozinha quando confirmar."
          : "Aguardando confirmação do pagamento. A tela atualiza sozinha.",
    };
  }

  if (provider === "ASAAS") {
    const s = status.toUpperCase();
    if (
      s === "RECEIVED" ||
      s === "CONFIRMED" ||
      s === "RECEIVED_IN_CASH"
    ) {
      return { kind: "paid" };
    }
    if (isAsaasRefusedStatus(s)) {
      return {
        kind: "rejected",
        message: asaasStatusMessage(s, result.refuseReason),
      };
    }
    return {
      kind: "pending",
      message: "Aguardando confirmação do pagamento. A tela atualiza sozinha.",
    };
  }

  const s = status.toLowerCase();
  if (["paid", "approved", "captured", "success"].includes(s)) {
    return { kind: "paid" };
  }
  if (["failed", "rejected", "declined", "refused"].includes(s)) {
    return {
      kind: "rejected",
      message: "Pagamento com cartão recusado. Tente outro cartão ou Pix.",
    };
  }
  return {
    kind: "pending",
    message: "Aguardando confirmação do pagamento. A tela atualiza sozinha.",
  };
}

/** Erros do SDK JS do Mercado Pago no browser (tokenização). */
export function messageFromMercadoPagoSdkError(err: unknown): string {
  const anyErr = err as {
    message?: string;
    cause?: string | number;
    status?: string;
  } | null;
  const msg = anyErr?.message || (err instanceof Error ? err.message : String(err || ""));
  const cause = anyErr?.cause != null ? String(anyErr.cause) : "";

  if (cause && MP_API_CAUSE[cause]) return MP_API_CAUSE[cause];
  if (/invalid.*card.*number|cardNumber/i.test(msg)) {
    return "Número do cartão inválido.";
  }
  if (/security.?code|cvv/i.test(msg)) {
    return "Código de segurança (CVV) inválido.";
  }
  if (/expiration|validade/i.test(msg)) {
    return "Data de validade do cartão inválida.";
  }
  if (/identification|document|cpf/i.test(msg)) {
    return "CPF inválido para o cartão. Confira o CPF do titular.";
  }
  if (/public.?key|unauthorized/i.test(msg)) {
    return "Pagamento temporariamente indisponível. Tente Pix ou volte mais tarde.";
  }
  return toPaymentUserMessage(msg || "Erro ao validar o cartão");
}
