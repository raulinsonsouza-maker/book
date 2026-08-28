import { prisma } from "@/lib/prisma";
import { sendCheckoutConfirmation } from "@/lib/email";

export async function confirmCheckoutOrder(orderId: string) {
  const existing = await prisma.checkoutOrder.findUnique({
    where: { id: orderId },
    include: {
      product: true,
      checkoutLink: true,
      payment: true,
    },
  });

  if (!existing) {
    throw new Error("Pedido não encontrado");
  }

  if (existing.status === "PAID") {
    return existing;
  }

  const now = new Date();
  const order = await prisma.checkoutOrder.update({
    where: { id: orderId },
    data: {
      status: "PAID",
      paidAt: now,
      confirmedAt: now,
      holdExpiresAt: null,
    },
    include: {
      product: true,
      checkoutLink: true,
      payment: true,
    },
  });

  if (order.payment && order.payment.status !== "PAID") {
    await prisma.payment.update({
      where: { id: order.payment.id },
      data: { status: "PAID", paidAt: now },
    });
  }

  await sendCheckoutConfirmation({
    to: order.customerEmail,
    customerName: order.customerName,
    productTitle: order.product.title,
    linkTitle: order.checkoutLink.title || order.product.title,
    priceCents: order.product.priceCents,
    orderId: order.id,
  });

  return order;
}

export async function markCheckoutPaymentPaidAndConfirm(orderId: string, paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      checkoutOrder: {
        include: { product: true, checkoutLink: true },
      },
    },
  });

  if (!payment || payment.checkoutOrderId !== orderId) return null;
  if (payment.checkoutOrder?.status === "PAID") {
    if (payment.status !== "PAID") {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: "PAID", paidAt: new Date() },
      });
    }
    return payment.checkoutOrder;
  }

  const order = await confirmCheckoutOrder(orderId);

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "PAID", paidAt: new Date() },
  });

  return order;
}
