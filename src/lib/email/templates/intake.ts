import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { renderEmailLayout, appUrl, escapeHtml } from "@/lib/email/templates/layout";
import { formatBRL } from "@/lib/utils";
import { resolveIntakeAlertRecipients } from "@/lib/intake/notify-emails";

export type IntakeAlertParams = {
  submissionId: string;
  productTitle: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  priceCents: number;
  partnerCount: number;
  tradeName?: string;
  paidAt: Date;
  organizationId: string;
  productNotifyEmails: string | null;
  productAlertsEnabled: boolean;
  orgNotifyEmails: string | null;
  orgAlertsEnabled: boolean;
};

export function intakeAlertEmail(params: IntakeAlertParams) {
  const when = format(params.paidAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  const phone = params.customerPhone.replace(/(\d{2})(\d{4,5})(\d{4})/, "($1) $2-$3");

  const bodyHtml = `
    <p>Um novo cliente contratou <strong>${escapeHtml(params.productTitle)}</strong>.</p>
    <p style="margin:16px 0;padding:16px;background:#f8f6f3;border-radius:10px;font-size:14px;line-height:1.7">
      <strong>${escapeHtml(params.customerName)}</strong><br />
      ${escapeHtml(params.customerEmail)} · ${escapeHtml(phone || params.customerPhone)}<br />
      ${params.partnerCount} sócio${params.partnerCount === 1 ? "" : "s"} · ${formatBRL(params.priceCents)} pago<br />
      ${params.tradeName ? `Nome fantasia: <strong>${escapeHtml(params.tradeName)}</strong><br />` : ""}
      Pedido em ${escapeHtml(when)}
    </p>
    <p style="font-size:14px;color:#555">O dossiê completo e os documentos estão no painel — não enviamos anexos por e-mail.</p>
  `;

  return {
    subject: `Novo cliente — ${params.productTitle}: ${params.customerName}`,
    html: renderEmailLayout({
      title: "Novo pedido de intake",
      preheader: `${params.customerName} · ${formatBRL(params.priceCents)}`,
      bodyHtml,
      cta: {
        label: "Ver dossiê completo",
        href: appUrl(`/app/intake/${params.submissionId}`),
      },
    }),
  };
}

export async function resolveRecipientsForIntakeAlert(
  params: IntakeAlertParams,
): Promise<string[]> {
  return resolveIntakeAlertRecipients({
    productNotifyEmails: params.productNotifyEmails,
    productAlertsEnabled: params.productAlertsEnabled,
    orgNotifyEmails: params.orgNotifyEmails,
    orgAlertsEnabled: params.orgAlertsEnabled,
    organizationId: params.organizationId,
  });
}
