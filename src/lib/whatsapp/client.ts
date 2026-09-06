import { prisma } from "@/lib/prisma";
import { getPlatformWhatsAppConfig } from "@/lib/whatsapp/config";
import { canSendWhatsApp } from "@/lib/whatsapp/quota";
import { e164Digits } from "@/lib/whatsapp/phone";
import type { WhatsAppMessageCategory } from "@prisma/client";

const GRAPH = "https://graph.facebook.com/v21.0";

type SendResult = {
  ok: boolean;
  logId?: string;
  metaMessageId?: string;
  error?: string;
  skipped?: boolean;
};

async function graphSend(input: {
  toE164: string;
  templateName: string;
  languageCode?: string;
  components?: unknown[];
  category: WhatsAppMessageCategory;
  organizationId?: string | null;
  bookingId?: string | null;
  customerId?: string | null;
  billable?: boolean;
  skipQuota?: boolean;
}): Promise<SendResult> {
  const cfg = await getPlatformWhatsAppConfig();
  if (!cfg.enabled) {
    return { ok: false, skipped: true, error: "whatsapp_disabled" };
  }
  if (!cfg.accessToken || !cfg.phoneNumberId) {
    return { ok: false, skipped: true, error: "whatsapp_not_configured" };
  }

  if (input.organizationId && !input.skipQuota) {
    const gate = await canSendWhatsApp(input.organizationId);
    if (!gate.ok) {
      return {
        ok: false,
        skipped: true,
        error: gate.reason || "quota",
      };
    }
  }

  const log = await prisma.whatsAppMessageLog.create({
    data: {
      organizationId: input.organizationId ?? null,
      bookingId: input.bookingId ?? null,
      customerId: input.customerId ?? null,
      category: input.category,
      templateName: input.templateName,
      toPhoneE164: input.toE164,
      status: "queued",
      billable: input.billable ?? true,
    },
  });

  try {
    const res = await fetch(`${GRAPH}/${cfg.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: e164Digits(input.toE164),
        type: "template",
        template: {
          name: input.templateName,
          language: { code: input.languageCode || "pt_BR" },
          components: input.components || [],
        },
      }),
    });

    const data = (await res.json()) as {
      messages?: { id: string }[];
      error?: { message?: string };
    };

    if (!res.ok) {
      const err = data.error?.message || `http_${res.status}`;
      await prisma.whatsAppMessageLog.update({
        where: { id: log.id },
        data: { status: "failed", error: err },
      });
      await prisma.platformWhatsAppConfig.update({
        where: { id: "singleton" },
        data: { lastError: err },
      });
      return { ok: false, logId: log.id, error: err };
    }

    const metaId = data.messages?.[0]?.id;
    await prisma.whatsAppMessageLog.update({
      where: { id: log.id },
      data: { status: "sent", metaMessageId: metaId || null, error: null },
    });
    return { ok: true, logId: log.id, metaMessageId: metaId };
  } catch (e) {
    const err = e instanceof Error ? e.message : "send_failed";
    await prisma.whatsAppMessageLog.update({
      where: { id: log.id },
      data: { status: "failed", error: err },
    });
    return { ok: false, logId: log.id, error: err };
  }
}

export async function sendWhatsAppOtp(input: {
  toE164: string;
  code: string;
  organizationId?: string | null;
  customerId?: string | null;
}): Promise<SendResult> {
  const cfg = await getPlatformWhatsAppConfig();
  return graphSend({
    toE164: input.toE164,
    templateName: cfg.templateOtpName,
    category: "AUTH",
    organizationId: input.organizationId,
    customerId: input.customerId,
    billable: true,
    skipQuota: !input.organizationId,
    components: [
      {
        type: "body",
        parameters: [{ type: "text", text: input.code }],
      },
      {
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: [{ type: "text", text: input.code }],
      },
    ],
  });
}

export async function sendWhatsAppBookingReminder(input: {
  toE164: string;
  organizationId: string;
  bookingId: string;
  customerId?: string | null;
  customerName: string;
  orgName: string;
  whenLabel: string;
  serviceTitle: string;
  buttonPath: string;
}): Promise<SendResult> {
  const cfg = await getPlatformWhatsAppConfig();
  // Utility body vars: name, org, when, service — button URL dynamic suffix
  return graphSend({
    toE164: input.toE164,
    templateName: cfg.templateReminderName,
    category: "UTILITY",
    organizationId: input.organizationId,
    bookingId: input.bookingId,
    customerId: input.customerId,
    billable: true,
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: input.customerName.slice(0, 60) },
          { type: "text", text: input.orgName.slice(0, 60) },
          { type: "text", text: input.whenLabel.slice(0, 60) },
          { type: "text", text: input.serviceTitle.slice(0, 60) },
        ],
      },
      {
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: [{ type: "text", text: input.buttonPath.replace(/^\//, "") }],
      },
    ],
  });
}

export async function sendWhatsAppTestOtp(toE164: string, code: string) {
  return graphSend({
    toE164,
    templateName: (await getPlatformWhatsAppConfig()).templateOtpName,
    category: "AUTH",
    billable: false,
    skipQuota: true,
    components: [
      {
        type: "body",
        parameters: [{ type: "text", text: code }],
      },
    ],
  });
}

/**
 * Convite de acesso ao painel do profissional.
 * Usa template opcional `WHATSAPP_TEMPLATE_PRO_INVITE` (body: nome, empresa, e-mail, senha).
 * Se não configurado, retorna skipped.
 */
export async function sendWhatsAppProfessionalInvite(input: {
  toE164: string;
  organizationId: string;
  displayName: string;
  organizationName: string;
  email: string;
  temporaryPassword: string;
}): Promise<SendResult> {
  const templateName = process.env.WHATSAPP_TEMPLATE_PRO_INVITE?.trim() || "";
  if (!templateName) {
    return { ok: false, skipped: true, error: "pro_invite_template_missing" };
  }

  return graphSend({
    toE164: input.toE164,
    templateName,
    category: "UTILITY",
    organizationId: input.organizationId,
    billable: true,
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: input.displayName.slice(0, 60) },
          { type: "text", text: input.organizationName.slice(0, 60) },
          { type: "text", text: input.email.slice(0, 60) },
          { type: "text", text: input.temporaryPassword.slice(0, 60) },
        ],
      },
    ],
  });
}
