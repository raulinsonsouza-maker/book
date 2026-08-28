import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { markPaymentPaidAndConfirm, SlotUnavailableError } from "@/lib/payments/confirm-booking";
import { markCheckoutPaymentPaidAndConfirm } from "@/lib/payments/confirm-checkout-order";

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

    const metadataRef =
      payload?.metadata?.bookingId ||
      payload?.metadata?.checkoutOrderId ||
      payload?.data?.metadata?.bookingId ||
      payload?.data?.metadata?.checkoutOrderId ||
      payload?.payment?.metadata?.bookingId ||
      payload?.payment?.metadata?.checkoutOrderId;

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
          checkoutOrder: {
            include: { product: true },
          },
        },
      });
    }
    if (!payment && metadataRef) {
      payment = await prisma.payment.findFirst({
        where: {
          OR: [
            { bookingId: String(metadataRef) },
            { checkoutOrderId: String(metadataRef) },
          ],
        },
        include: {
          booking: {
            include: { service: true, bookingPage: true },
          },
          checkoutOrder: {
            include: { product: true },
          },
        },
      });
    }

    if (!payment) {
      return NextResponse.json({ received: true, matched: false });
    }

    if (payment.checkoutOrderId && payment.checkoutOrder) {
      if (payment.checkoutOrder.status === "PAID") {
        return NextResponse.json({ received: true, already: true });
      }
      await markCheckoutPaymentPaidAndConfirm(payment.checkoutOrderId, payment.id);
      return NextResponse.json({
        received: true,
        confirmed: payment.checkoutOrderId,
        type: "checkout",
      });
    }

    if (!payment.booking) {
      return NextResponse.json({ received: true, matched: false });
    }

    if (payment.booking.status === "CONFIRMED") {
      return NextResponse.json({ received: true, already: true });
    }

    if (!payment.bookingId) {
      return NextResponse.json({ received: true, matched: false });
    }

    try {
      await markPaymentPaidAndConfirm(payment.bookingId, payment.id);
    } catch (e) {
      if (e instanceof SlotUnavailableError) {
        console.warn(
          "[cakto:webhook:slot-unavailable]",
          payment.bookingId,
          e.message,
        );
        return NextResponse.json({
          received: true,
          confirmed: false,
          slotUnavailable: true,
        });
      }
      throw e;
    }

    return NextResponse.json({
      received: true,
      confirmed: payment.bookingId,
      type: "booking",
    });
  } catch (e) {
    console.error("[cakto:webhook:error]", e);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
