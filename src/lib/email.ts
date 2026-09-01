import { Resend } from "resend";
import { emailFrom } from "@/lib/email/templates/layout";
import {
  bookingCancelledClientEmail,
  bookingCancelledProEmail,
  bookingConfirmationEmail,
  bookingReminderEmail,
  bookingRescheduledClientEmail,
  bookingRescheduledProEmail,
  checkoutConfirmationEmail,
  feedbackRequestEmail,
  paymentFailedEmail,
  pixPendingEmail,
  proNewBookingEmail,
} from "@/lib/email/templates/booking";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

async function send(params: {
  to: string;
  subject: string;
  html: string;
  tag: string;
}) {
  if (!resend) {
    console.log(`[email:demo] ${params.tag} →`, params.to, params.subject);
    return { ok: true as const, demo: true };
  }
  await resend.emails.send({
    from: emailFrom(),
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
  return { ok: true as const, demo: false };
}

export async function sendBookingConfirmation(
  params: Parameters<typeof bookingConfirmationEmail>[0] & { to: string },
) {
  const { to, ...rest } = params;
  const tpl = bookingConfirmationEmail(rest);
  return send({ to, ...tpl, tag: "booking.confirmation" });
}

export async function sendProNewBooking(
  params: Parameters<typeof proNewBookingEmail>[0] & { to: string },
) {
  const { to, ...rest } = params;
  const tpl = proNewBookingEmail(rest);
  return send({ to, ...tpl, tag: "pro.new_booking" });
}

export async function sendBookingReminder(
  params: Parameters<typeof bookingReminderEmail>[0] & { to: string },
) {
  const { to, ...rest } = params;
  const tpl = bookingReminderEmail(rest);
  return send({ to, ...tpl, tag: "booking.reminder" });
}

export async function sendBookingCancelledClient(
  params: Parameters<typeof bookingCancelledClientEmail>[0] & { to: string },
) {
  const { to, ...rest } = params;
  const tpl = bookingCancelledClientEmail(rest);
  return send({ to, ...tpl, tag: "booking.cancelled.client" });
}

export async function sendBookingCancelledPro(
  params: Parameters<typeof bookingCancelledProEmail>[0] & { to: string },
) {
  const { to, ...rest } = params;
  const tpl = bookingCancelledProEmail(rest);
  return send({ to, ...tpl, tag: "booking.cancelled.pro" });
}

export async function sendBookingRescheduledClient(
  params: Parameters<typeof bookingRescheduledClientEmail>[0] & { to: string },
) {
  const { to, ...rest } = params;
  const tpl = bookingRescheduledClientEmail(rest);
  return send({ to, ...tpl, tag: "booking.rescheduled.client" });
}

export async function sendBookingRescheduledPro(
  params: Parameters<typeof bookingRescheduledProEmail>[0] & { to: string },
) {
  const { to, ...rest } = params;
  const tpl = bookingRescheduledProEmail(rest);
  return send({ to, ...tpl, tag: "booking.rescheduled.pro" });
}

export async function sendPaymentFailed(
  params: Parameters<typeof paymentFailedEmail>[0] & { to: string },
) {
  const { to, ...rest } = params;
  const tpl = paymentFailedEmail(rest);
  return send({ to, ...tpl, tag: "payment.failed" });
}

export async function sendPixPending(
  params: Parameters<typeof pixPendingEmail>[0] & { to: string },
) {
  const { to, ...rest } = params;
  const tpl = pixPendingEmail(rest);
  return send({ to, ...tpl, tag: "payment.pix_pending" });
}

export async function sendFeedbackRequest(
  params: Parameters<typeof feedbackRequestEmail>[0] & { to: string },
) {
  const { to, ...rest } = params;
  const tpl = feedbackRequestEmail(rest);
  return send({ to, ...tpl, tag: "booking.feedback" });
}

export async function sendCheckoutConfirmation(params: {
  to: string;
  customerName: string;
  productTitle: string;
  linkTitle: string;
  priceCents: number;
  orderId: string;
  intakeDocuments?: boolean;
}) {
  const { to, ...rest } = params;
  const tpl = checkoutConfirmationEmail(rest);
  return send({ to, ...tpl, tag: "checkout.confirmation" });
}

export async function sendIntakeAlertToTeam(
  params: import("@/lib/email/templates/intake").IntakeAlertParams,
) {
  const {
    intakeAlertEmail,
    resolveRecipientsForIntakeAlert,
  } = await import("@/lib/email/templates/intake");
  const recipients = await resolveRecipientsForIntakeAlert(params);
  if (recipients.length === 0) return { ok: true as const, skipped: true };

  const tpl = intakeAlertEmail(params);
  const results = [];
  for (const to of recipients) {
    results.push(
      await send({ to, ...tpl, tag: "intake.team_alert" }),
    );
  }
  return { ok: true as const, recipients };
}
