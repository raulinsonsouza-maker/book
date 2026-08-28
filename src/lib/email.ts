import { Resend } from "resend";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { formatBRL } from "@/lib/utils";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

type ConfirmEmailParams = {
  to: string;
  customerName: string;
  serviceTitle: string;
  pageTitle: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
  priceCents: number;
  bookingId: string;
};

export async function sendBookingConfirmation(params: ConfirmEmailParams) {
  const startLocal = toZonedTime(params.startAt, params.timezone);
  const endLocal = toZonedTime(params.endAt, params.timezone);
  const when = `${format(startLocal, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })} · ${format(startLocal, "HH:mm")}–${format(endLocal, "HH:mm")}`;

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
      <h1 style="font-size:22px;margin-bottom:8px">Agendamento confirmado</h1>
      <p>Olá, ${params.customerName}!</p>
      <p>Sua consulta <strong>${params.serviceTitle}</strong> em <strong>${params.pageTitle}</strong> está confirmada.</p>
      <div style="background:#f7f5f2;border-radius:12px;padding:16px;margin:20px 0">
        <p style="margin:0 0 8px"><strong>Quando:</strong> ${when}</p>
        <p style="margin:0 0 8px"><strong>Fuso:</strong> ${params.timezone}</p>
        <p style="margin:0"><strong>Valor:</strong> ${formatBRL(params.priceCents)}</p>
      </div>
      <p style="color:#666;font-size:13px">Código: ${params.bookingId}</p>
    </div>
  `;

  if (!resend) {
    console.log("[email:demo] Booking confirmation →", params.to, when);
    return { ok: true, demo: true };
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM || "Book Symbius <onboarding@resend.dev>",
    to: params.to,
    subject: `Confirmado: ${params.serviceTitle}`,
    html,
  });
  return { ok: true, demo: false };
}

type CheckoutConfirmEmailParams = {
  to: string;
  customerName: string;
  productTitle: string;
  linkTitle: string;
  priceCents: number;
  orderId: string;
};

export async function sendCheckoutConfirmation(params: CheckoutConfirmEmailParams) {
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
      <h1 style="font-size:22px;margin-bottom:8px">Pagamento confirmado</h1>
      <p>Olá, ${params.customerName}!</p>
      <p>Seu pagamento de <strong>${params.productTitle}</strong> foi confirmado.</p>
      <div style="background:#f7f5f2;border-radius:12px;padding:16px;margin:20px 0">
        <p style="margin:0 0 8px"><strong>Produto:</strong> ${params.linkTitle}</p>
        <p style="margin:0"><strong>Valor:</strong> ${formatBRL(params.priceCents)}</p>
      </div>
      <p style="color:#666;font-size:13px">Código: ${params.orderId}</p>
    </div>
  `;

  if (!resend) {
    console.log("[email:demo] Checkout confirmation →", params.to, params.productTitle);
    return { ok: true, demo: true };
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM || "Book Symbius <onboarding@resend.dev>",
    to: params.to,
    subject: `Confirmado: ${params.productTitle}`,
    html,
  });
  return { ok: true, demo: false };
}
