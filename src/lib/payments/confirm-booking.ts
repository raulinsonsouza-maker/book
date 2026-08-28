import { prisma } from "@/lib/prisma";
import { sendBookingConfirmation } from "@/lib/email";
import { syncBookingToGoogle } from "@/lib/google/calendar";
import { assertSlotAvailable, SlotUnavailableError } from "@/lib/availability";

export { SlotUnavailableError };

export async function confirmBooking(bookingId: string) {
  const existing = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: true, bookingPage: true },
  });

  if (!existing) {
    throw new Error("Agendamento não encontrado");
  }

  if (existing.status === "CONFIRMED") {
    return existing;
  }

  try {
    await assertSlotAvailable({
      bookingPageId: existing.bookingPageId,
      serviceId: existing.serviceId,
      startAt: existing.startAt,
      endAt: existing.endAt,
      timezone: existing.timezone,
      durationMinutes: existing.service.durationMinutes,
      bufferBefore: existing.service.bufferBefore,
      bufferAfter: existing.service.bufferAfter,
      excludeBookingId: bookingId,
    });
  } catch (e) {
    if (e instanceof SlotUnavailableError) {
      await prisma.$transaction([
        prisma.booking.update({
          where: { id: bookingId },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            holdExpiresAt: null,
          },
        }),
        prisma.slotHold.deleteMany({ where: { bookingId } }),
      ]);
    }
    throw e;
  }

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "CONFIRMED",
      confirmedAt: new Date(),
      holdExpiresAt: null,
    },
    include: {
      service: true,
      bookingPage: true,
    },
  });
  await prisma.slotHold.deleteMany({ where: { bookingId } });
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
  return booking;
}

export async function markPaymentPaidAndConfirm(bookingId: string, paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      booking: {
        include: { service: true, bookingPage: true },
      },
    },
  });
  if (!payment || payment.bookingId !== bookingId || !payment.booking) return null;
  if (payment.booking.status === "CONFIRMED") {
    if (payment.status !== "PAID") {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: "PAID", paidAt: new Date() },
      });
    }
    return payment.booking;
  }

  const booking = await confirmBooking(bookingId);

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "PAID", paidAt: new Date() },
  });

  return booking;
}
