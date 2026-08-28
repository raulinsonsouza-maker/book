import { prisma } from "@/lib/prisma";
import { sendBookingConfirmation } from "@/lib/email";
import { syncBookingToGoogle } from "@/lib/google/calendar";

export async function confirmBooking(bookingId: string) {
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
    include: { booking: true },
  });
  if (!payment || payment.bookingId !== bookingId) return null;
  if (payment.booking.status === "CONFIRMED") {
    return payment.booking;
  }
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "PAID", paidAt: new Date() },
  });
  return confirmBooking(bookingId);
}
