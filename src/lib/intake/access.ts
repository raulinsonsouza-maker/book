import { addMinutes } from "date-fns";
import { prisma } from "@/lib/prisma";

const HOLD_MINUTES = 15;

export async function loadIntakeCheckoutLink(slug: string) {
  return prisma.checkoutLink.findFirst({
    where: { slug, isActive: true },
    include: {
      product: { include: { organization: true } },
    },
  });
}

export async function loadIntakeOrder(orderId: string, slug: string) {
  return prisma.checkoutOrder.findFirst({
    where: {
      id: orderId,
      checkoutLink: { slug, isActive: true },
    },
    include: {
      product: { include: { organization: true } },
      checkoutLink: true,
      intakeSubmission: { include: { attachments: true } },
    },
  });
}

export async function ensureIntakeOrderHold(orderId: string, slug: string) {
  const order = await loadIntakeOrder(orderId, slug);
  if (!order) return null;
  if (order.status !== "PENDING_PAYMENT") return order;

  const holdExpiresAt = addMinutes(new Date(), HOLD_MINUTES);
  if (
    !order.holdExpiresAt ||
    order.holdExpiresAt.getTime() < Date.now() + 60_000
  ) {
    await prisma.checkoutOrder.update({
      where: { id: order.id },
      data: { holdExpiresAt },
    });
    order.holdExpiresAt = holdExpiresAt;
  }
  return order;
}

export function orderHoldExpired(order: { holdExpiresAt: Date | null; status: string }) {
  if (order.status !== "PENDING_PAYMENT") return false;
  if (!order.holdExpiresAt) return false;
  return order.holdExpiresAt.getTime() <= Date.now();
}
