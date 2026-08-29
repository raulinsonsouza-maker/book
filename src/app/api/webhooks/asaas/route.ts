import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAsaasPayment, isAsaasPaidStatus } from "@/lib/asaas/client";
import { markPaymentPaidAndConfirm, SlotUnavailableError } from "@/lib/payments/confirm-booking";
import { markCheckoutPaymentPaidAndConfirm } from "@/lib/payments/confirm-checkout-order";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("asaas-access-token");
    const payload = await req.json().catch(() => null);
    console.log("[asaas:webhook]", JSON.stringify(payload).slice(0, 500));

    const paymentId =
      payload?.payment?.id ||
      payload?.id ||
      null;

    if (!paymentId) {
      return NextResponse.json({ received: true, matched: false });
    }

    const localPayment = await prisma.payment.findFirst({
      where: { caktoPaymentId: String(paymentId), provider: "ASAAS" },
      include: {
        booking: {
          include: {
            bookingPage: { include: { organization: true } },
          },
        },
        checkoutOrder: {
          include: {
            product: { include: { organization: true } },
          },
        },
      },
    });

    if (!localPayment) {
      return NextResponse.json({ received: true, matched: false });
    }

    const org =
      localPayment.checkoutOrder?.product.organization ||
      localPayment.booking?.bookingPage.organization;

    if (!org?.asaasApiKey) {
      return NextResponse.json({ received: true, noCredentials: true });
    }

    if (token && org.asaasWebhookToken && token !== org.asaasWebhookToken) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const asaasPayment = await getAsaasPayment(org.asaasApiKey, String(paymentId));
    if (!isAsaasPaidStatus(asaasPayment.status)) {
      return NextResponse.json({ received: true, ignored: asaasPayment.status });
    }

    if (localPayment.checkoutOrderId && localPayment.checkoutOrder) {
      if (localPayment.checkoutOrder.status === "PAID") {
        return NextResponse.json({ received: true, already: true });
      }
      await markCheckoutPaymentPaidAndConfirm(
        localPayment.checkoutOrderId,
        localPayment.id,
      );
      return NextResponse.json({
        received: true,
        confirmed: localPayment.checkoutOrderId,
        type: "checkout",
      });
    }

    if (!localPayment.booking || !localPayment.bookingId) {
      return NextResponse.json({ received: true, matched: false });
    }

    if (localPayment.booking.status === "CONFIRMED") {
      return NextResponse.json({ received: true, already: true });
    }

    try {
      await markPaymentPaidAndConfirm(localPayment.bookingId, localPayment.id);
    } catch (e) {
      if (e instanceof SlotUnavailableError) {
        console.warn(
          "[asaas:webhook:slot-unavailable]",
          localPayment.bookingId,
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
      confirmed: localPayment.bookingId,
      type: "booking",
    });
  } catch (e) {
    console.error("[asaas:webhook:error]", e);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
