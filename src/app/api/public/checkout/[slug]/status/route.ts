import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reconcileCheckoutPaymentIfNeeded } from "@/lib/payments/reconcile-checkout-payment";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const orderId = new URL(req.url).searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.json({ error: "orderId obrigatório" }, { status: 400 });
  }

  const existing = await prisma.checkoutOrder.findFirst({
    where: {
      id: orderId,
      checkoutLink: { slug, isActive: true },
    },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  await reconcileCheckoutPaymentIfNeeded(orderId);

  const order = await prisma.checkoutOrder.findFirst({
    where: {
      id: orderId,
      checkoutLink: { slug, isActive: true },
    },
    include: {
      product: true,
      payment: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    status: order.status,
    paymentStatus: order.payment?.status ?? null,
    productTitle: order.product.title,
    amountCents: order.product.priceCents,
  });
}
