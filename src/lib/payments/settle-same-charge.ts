import { prisma } from "@/lib/prisma";

/**
 * Quando um pagamento entra, tira da fila as tentativas ainda abertas
 * da mesma pessoa, do mesmo valor e do mesmo produto ou serviço.
 * Não marca essas tentativas como pagas — só encerra a pendência.
 */
export async function settleSameChargePendings(params: {
  organizationId: string;
  customerEmail: string;
  amountCents: number;
  productId?: string | null;
  serviceId?: string | null;
  exceptOrderId?: string | null;
  exceptBookingId?: string | null;
}) {
  const email = params.customerEmail.trim().toLowerCase();
  if (!email || params.amountCents <= 0) return;

  if (params.productId) {
    const orders = await prisma.checkoutOrder.findMany({
      where: {
        ...(params.exceptOrderId ? { id: { not: params.exceptOrderId } } : {}),
        productId: params.productId,
        status: "PENDING_PAYMENT",
        customerEmail: email,
        product: { organizationId: params.organizationId },
        payment: {
          is: { status: "PENDING", amountCents: params.amountCents },
        },
      },
      select: { id: true },
    });
    if (orders.length > 0) {
      await prisma.checkoutOrder.updateMany({
        where: { id: { in: orders.map((order) => order.id) } },
        data: { status: "EXPIRED", holdExpiresAt: null },
      });
    }
  }

  if (params.serviceId) {
    const bookings = await prisma.booking.findMany({
      where: {
        ...(params.exceptBookingId
          ? { id: { not: params.exceptBookingId } }
          : {}),
        serviceId: params.serviceId,
        status: "PENDING_PAYMENT",
        customerEmail: email,
        bookingPage: { organizationId: params.organizationId },
        payment: {
          is: { status: "PENDING", amountCents: params.amountCents },
        },
      },
      select: { id: true },
    });
    if (bookings.length > 0) {
      const ids = bookings.map((booking) => booking.id);
      await prisma.booking.updateMany({
        where: { id: { in: ids } },
        data: { status: "EXPIRED", holdExpiresAt: null },
      });
      await prisma.slotHold.deleteMany({ where: { bookingId: { in: ids } } });
    }
  }
}
