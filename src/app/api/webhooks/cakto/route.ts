import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBookingConfirmation } from "@/lib/email";
import { syncBookingToGoogle } from "@/lib/google/calendar";

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

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "PAID", paidAt: new Date() },
    });

    const booking = await prisma.booking.update({
      where: { id: payment.bookingId },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        holdExpiresAt: null,
      },
      include: { service: true, bookingPage: true },
    });

    await prisma.slotHold.deleteMany({ where: { bookingId: booking.id } });

    await sendBookingConfirmation({
      to: booking.customerEmail,
      customerName: booking.customerName,
      serviceTitle: booking.service.title,
      pageTitle: booking.bookingPage.title,
      startAt: booking.startAt,
      endAt: booking.endAt,
      timezone: booking.timezone,
      priceCents: booking.service.priceCents,
      bookingId: booking.id,
    });

    void syncBookingToGoogle(booking.id);

    return NextResponse.json({ received: true, confirmed: booking.id });
  } catch (e) {
    console.error("[cakto:webhook:error]", e);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
