import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMercadoPagoPayment, isMercadoPagoPaidStatus } from "@/lib/mercadopago/client";
import { markPaymentPaidAndConfirm } from "@/lib/payments/confirm-booking";

/**
 * Mercado Pago webhook / IPN
 * Configure em Suas integrações → Webhooks:
 * https://seu-dominio/api/webhooks/mercadopago
 */
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
      },
    });

    if (!localPayment) {
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

    await markPaymentPaidAndConfirm(localPayment.bookingId, localPayment.id);

    return NextResponse.json({
      received: true,
      confirmed: localPayment.bookingId,
    });
  } catch (e) {
    console.error("[mercadopago:webhook:error]", e);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}
