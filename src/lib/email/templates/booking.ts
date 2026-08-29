import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { formatBRL } from "@/lib/utils";
import {
  appUrl,
  detailBox,
  escapeHtml,
  renderEmailLayout,
} from "@/lib/email/templates/layout";

function whenLabel(startAt: Date, endAt: Date, timezone: string) {
  const startLocal = toZonedTime(startAt, timezone);
  const endLocal = toZonedTime(endAt, timezone);
  const date = format(startLocal, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  const time = `${format(startLocal, "HH:mm")}–${format(endLocal, "HH:mm")}`;
  return { date, time, dateCapitalized: date.charAt(0).toUpperCase() + date.slice(1) };
}

export function bookingConfirmationEmail(params: {
  customerName: string;
  serviceTitle: string;
  professionalName: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
  priceCents: number;
  meetLink?: string | null;
  manageUrl: string;
}) {
  const { dateCapitalized, time } = whenLabel(params.startAt, params.endAt, params.timezone);
  const local = params.meetLink || "A combinar com o profissional";
  const body = `
    <p>Olá, ${escapeHtml(params.customerName)}.</p>
    <p>Seu agendamento foi confirmado com sucesso. O pagamento também foi confirmado.</p>
    ${detailBox([
      { label: "Data", value: dateCapitalized },
      { label: "Horário", value: time },
      { label: "Serviço", value: params.serviceTitle },
      { label: "Profissional", value: params.professionalName },
      { label: "Local / link", value: local },
      { label: "Valor", value: formatBRL(params.priceCents) },
    ])}
    <p style="color:#555;font-size:14px">Se precisar cancelar ou remarcar, use o botão abaixo.</p>
  `;
  return {
    subject: `Agendamento confirmado — ${params.serviceTitle}`,
    html: renderEmailLayout({
      title: "Agendamento confirmado",
      preheader: `${params.serviceTitle} · ${dateCapitalized} às ${time.split("–")[0]}`,
      bodyHtml: body,
      cta: { label: "Gerenciar agendamento", href: params.manageUrl },
    }),
  };
}

export function proNewBookingEmail(params: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceTitle: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
  priceCents: number;
  adminUrl: string;
}) {
  const { dateCapitalized, time } = whenLabel(params.startAt, params.endAt, params.timezone);
  const body = `
    <p>Novo agendamento confirmado.</p>
    ${detailBox([
      { label: "Cliente", value: params.customerName },
      { label: "E-mail", value: params.customerEmail },
      { label: "Telefone", value: params.customerPhone },
      { label: "Serviço", value: params.serviceTitle },
      { label: "Data", value: dateCapitalized },
      { label: "Horário", value: time },
      { label: "Valor", value: formatBRL(params.priceCents) },
      { label: "Pagamento", value: "Confirmado" },
    ])}
  `;
  return {
    subject: `Novo agendamento confirmado — ${params.customerName}`,
    html: renderEmailLayout({
      title: "Novo agendamento confirmado",
      bodyHtml: body,
      cta: { label: "Ver agendamento", href: params.adminUrl },
    }),
  };
}

export function bookingReminderEmail(params: {
  customerName: string;
  serviceTitle: string;
  professionalName: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
  meetLink?: string | null;
  manageUrl: string;
}) {
  const { dateCapitalized, time } = whenLabel(params.startAt, params.endAt, params.timezone);
  const startLocal = toZonedTime(params.startAt, params.timezone);
  const hour = format(startLocal, "HH:mm");
  const body = `
    <p>Olá, ${escapeHtml(params.customerName)}.</p>
    <p>Lembrete: seu agendamento é <strong>${escapeHtml(dateCapitalized)}</strong> às <strong>${escapeHtml(hour)}</strong>.</p>
    ${detailBox([
      { label: "Serviço", value: params.serviceTitle },
      { label: "Profissional", value: params.professionalName },
      { label: "Data", value: dateCapitalized },
      { label: "Horário", value: time },
      { label: "Local / link", value: params.meetLink || "A combinar com o profissional" },
    ])}
  `;
  return {
    subject: `Lembrete: seu agendamento às ${hour}`,
    html: renderEmailLayout({
      title: "Lembrete do agendamento",
      bodyHtml: body,
      cta: { label: "Gerenciar agendamento", href: params.manageUrl },
    }),
  };
}

export function bookingCancelledClientEmail(params: {
  customerName: string;
  serviceTitle: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
  bookAgainUrl: string;
}) {
  const { dateCapitalized, time } = whenLabel(params.startAt, params.endAt, params.timezone);
  const body = `
    <p>Olá, ${escapeHtml(params.customerName)}.</p>
    <p>Seu agendamento foi cancelado.</p>
    ${detailBox([
      { label: "Serviço", value: params.serviceTitle },
      { label: "Data", value: dateCapitalized },
      { label: "Horário", value: time },
    ])}
    <p style="color:#555;font-size:14px">Se o pagamento já havia sido confirmado, a política de reembolso segue o acordo com o profissional.</p>
  `;
  return {
    subject: `Agendamento cancelado — ${params.serviceTitle}`,
    html: renderEmailLayout({
      title: "Agendamento cancelado",
      bodyHtml: body,
      cta: { label: "Realizar novo agendamento", href: params.bookAgainUrl },
    }),
  };
}

export function bookingCancelledProEmail(params: {
  customerName: string;
  serviceTitle: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
  adminUrl: string;
}) {
  const { dateCapitalized, time } = whenLabel(params.startAt, params.endAt, params.timezone);
  const body = `
    <p>Um agendamento foi cancelado.</p>
    ${detailBox([
      { label: "Cliente", value: params.customerName },
      { label: "Serviço", value: params.serviceTitle },
      { label: "Data", value: dateCapitalized },
      { label: "Horário", value: time },
    ])}
  `;
  return {
    subject: `Agendamento cancelado — ${params.customerName}`,
    html: renderEmailLayout({
      title: "Agendamento cancelado",
      bodyHtml: body,
      cta: { label: "Ver agenda", href: params.adminUrl },
    }),
  };
}

export function bookingRescheduledClientEmail(params: {
  customerName: string;
  serviceTitle: string;
  professionalName: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
  meetLink?: string | null;
  manageUrl: string;
}) {
  const { dateCapitalized, time } = whenLabel(params.startAt, params.endAt, params.timezone);
  const body = `
    <p>Olá, ${escapeHtml(params.customerName)}.</p>
    <p>Seu novo horário está confirmado.</p>
    ${detailBox([
      { label: "Serviço", value: params.serviceTitle },
      { label: "Profissional", value: params.professionalName },
      { label: "Nova data", value: dateCapitalized },
      { label: "Novo horário", value: time },
      { label: "Local / link", value: params.meetLink || "A combinar com o profissional" },
    ])}
  `;
  return {
    subject: `Horário remarcado — ${params.serviceTitle}`,
    html: renderEmailLayout({
      title: "Agendamento remarcado",
      bodyHtml: body,
      cta: { label: "Gerenciar agendamento", href: params.manageUrl },
    }),
  };
}

export function bookingRescheduledProEmail(params: {
  customerName: string;
  serviceTitle: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
  adminUrl: string;
}) {
  const { dateCapitalized, time } = whenLabel(params.startAt, params.endAt, params.timezone);
  const body = `
    <p>Um agendamento foi remarcado.</p>
    ${detailBox([
      { label: "Cliente", value: params.customerName },
      { label: "Serviço", value: params.serviceTitle },
      { label: "Nova data", value: dateCapitalized },
      { label: "Novo horário", value: time },
    ])}
  `;
  return {
    subject: `Agendamento remarcado — ${params.customerName}`,
    html: renderEmailLayout({
      title: "Agendamento remarcado",
      bodyHtml: body,
      cta: { label: "Ver agenda", href: params.adminUrl },
    }),
  };
}

export function paymentFailedEmail(params: {
  customerName: string;
  serviceTitle: string;
  retryUrl: string;
}) {
  const body = `
    <p>Olá, ${escapeHtml(params.customerName)}.</p>
    <p>Não conseguimos confirmar seu pagamento para <strong>${escapeHtml(params.serviceTitle)}</strong>.</p>
    <p>Você pode tentar novamente pelo link abaixo. O horário só é reservado enquanto o prazo de pagamento estiver válido.</p>
  `;
  return {
    subject: `Pagamento não confirmado — ${params.serviceTitle}`,
    html: renderEmailLayout({
      title: "Não conseguimos confirmar seu pagamento",
      bodyHtml: body,
      cta: { label: "Tentar novamente", href: params.retryUrl },
    }),
  };
}

export function pixPendingEmail(params: {
  customerName: string;
  serviceTitle: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
  payUrl: string;
}) {
  const { dateCapitalized, time } = whenLabel(params.startAt, params.endAt, params.timezone);
  const body = `
    <p>Olá, ${escapeHtml(params.customerName)}.</p>
    <p>Seu agendamento ainda está aguardando a confirmação do pagamento.</p>
    ${detailBox([
      { label: "Serviço", value: params.serviceTitle },
      { label: "Data", value: dateCapitalized },
      { label: "Horário", value: time },
    ])}
  `;
  return {
    subject: `Aguardando pagamento — ${params.serviceTitle}`,
    html: renderEmailLayout({
      title: "Pagamento pendente",
      bodyHtml: body,
      cta: { label: "Concluir pagamento", href: params.payUrl },
    }),
  };
}

export function feedbackRequestEmail(params: {
  customerName: string;
  serviceTitle: string;
  professionalName: string;
  feedbackUrl: string;
}) {
  const body = `
    <p>Olá, ${escapeHtml(params.customerName)}.</p>
    <p>Como foi sua experiência com <strong>${escapeHtml(params.serviceTitle)}</strong> (${escapeHtml(params.professionalName)})?</p>
    <p>Seu feedback ajuda a melhorar o atendimento.</p>
  `;
  return {
    subject: `Como foi sua experiência? — ${params.serviceTitle}`,
    html: renderEmailLayout({
      title: "Como foi sua experiência?",
      bodyHtml: body,
      cta: { label: "Enviar feedback", href: params.feedbackUrl },
    }),
  };
}

export function checkoutConfirmationEmail(params: {
  customerName: string;
  productTitle: string;
  linkTitle: string;
  priceCents: number;
  orderId: string;
}) {
  const body = `
    <p>Olá, ${escapeHtml(params.customerName)}.</p>
    <p>Seu pagamento foi confirmado.</p>
    ${detailBox([
      { label: "Produto", value: params.productTitle },
      { label: "Pedido", value: params.linkTitle },
      { label: "Valor", value: formatBRL(params.priceCents) },
      { label: "Código", value: params.orderId },
    ])}
  `;
  return {
    subject: `Pagamento confirmado — ${params.productTitle}`,
    html: renderEmailLayout({
      title: "Pagamento confirmado",
      bodyHtml: body,
      cta: { label: "Abrir Book Symbius", href: appUrl("/") },
    }),
  };
}
