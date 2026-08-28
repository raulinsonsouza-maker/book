import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMercadoPagoPayment, isMercadoPagoPaidStatus } from "@/lib/mercadopago/client";
import { markPaymentPaidAndConfirm, SlotUnavailableError } from "@/lib/payments/confirm-booking";
import { markCheckoutPaymentPaidAndConfirm } from "@/lib/payments/confirm-checkout-order";

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    let paymentId =
      url.searchParams.get("data.id") ||
      url.searchParams.get("id") ||
      null;

    if (!paymentId) {
      const payload = await req.json().catch(() => null);
      if (payload) {
        console.log("[mercadopago:webhook]", JSON.stringify(payload).slice(0, 500));
        paymentId =
          payload?.data?.id ||
          payload?.id ||
          (typeof payload?.resource === "string"
            ? payload.resource.split("/").pop()
            : null) ||
          null;
      }
    }

    if (!paymentId) {
      return NextResponse.json({ received: true, matched: false });
    }

    const localPayment = await prisma.payment.findFirst({
      where: { caktoPaymentId: String(paymentId), provider: "MERCADO_PAGO" },
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

    if (localPayment.checkoutOrderId && localPayment.checkoutOrder) {
      if (localPayment.checkoutOrder.status === "PAID") {
        return NextResponse.json({ received: true, already: true });
      }
      const accessToken =
        localPayment.checkoutOrder.product.organization.mercadoPagoAccessToken;
      if (!accessToken) {
        return NextResponse.json({ received: true, noCredentials: true });
      }
      const mpPayment = await getMercadoPagoPayment(accessToken, String(paymentId));
      if (!isMercadoPagoPaidStatus(mpPayment.status)) {
        return NextResponse.json({ received: true, ignored: mpPayment.status });
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

    if (!localPayment.booking) {
      return NextResponse.json({ received: true, matched: false });
    }

    if (localPayment.booking.status === "CONFIRMED") {
      return NextResponse.json({ received: true, already: true });
    }

    const accessToken =
      localPayment.booking.bookingPage.organization.mercadoPagoAccessToken;
    if (!accessToken) {
      return NextResponse.json({ received: true, noCredentials: true });
    }

    const mpPayment = await getMercadoPagoPayment(accessToken, String(paymentId));
    if (!isMercadoPagoPaidStatus(mpPayment.status)) {
      return NextResponse.json({ received: true, ignored: mpPayment.status });
    }

    if (!localPayment.bookingId) {
      return NextResponse.json({ received: true, matched: false });
    }

    try {
      await markPaymentPaidAndConfirm(localPayment.bookingId, localPayment.id);
    } catch (e) {
      if (e instanceof SlotUnavailableError) {
        console.warn(
          "[mercadopago:webhook:slot-unavailable]",
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
    console.error("[mercadopago:webhook:error]", e);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}
