import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { markPaymentPaidAndConfirm } from "@/lib/payments/confirm-booking";

/**
 * Cakto webhook — confirma pagamento e libera o booking.
 * Configure a URL: https://seu-dominio/api/webhooks/cakto
 */
export async function POST(req: Request) {
  try {
    const payload = await req.json();
    console.log("[cakto:webhook]", JSON.stringify(payload).slice(0, 500));

    const paymentId =
      payload?.id ||
      payload?.payment?.id ||
      payload?.data?.id ||
      payload?.paymentId;

    const status = String(
      payload?.status || payload?.data?.status || payload?.event || "",
    ).toLowerCase();

    const metadataBookingId =
      payload?.metadata?.bookingId ||
      payload?.data?.metadata?.bookingId ||
      payload?.payment?.metadata?.bookingId;

    const paidStatuses = [
      "paid",
      "approved",
      "captured",
      "success",
      "payment.paid",
      "order.paid",
    ];

    if (!paidStatuses.some((s) => status.includes(s) || status === s)) {
      return NextResponse.json({ received: true, ignored: true });
    }

    let payment = null;
    if (paymentId) {
      payment = await prisma.payment.findFirst({
        where: { caktoPaymentId: String(paymentId) },
        include: {
          booking: {
            include: { service: true, bookingPage: true },
          },
        },
      });
    }
    if (!payment && metadataBookingId) {
      payment = await prisma.payment.findFirst({
        where: { bookingId: String(metadataBookingId) },
        include: {
          booking: {
            include: { service: true, bookingPage: true },
          },
        },
      });
    }

    if (!payment) {
      return NextResponse.json({ received: true, matched: false });
    }

    if (payment.booking.status === "CONFIRMED") {
      return NextResponse.json({ received: true, already: true });
    }

    await markPaymentPaidAndConfirm(payment.bookingId, payment.id);

    return NextResponse.json({ received: true, confirmed: payment.bookingId });
  } catch (e) {
    console.error("[cakto:webhook:error]", e);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
