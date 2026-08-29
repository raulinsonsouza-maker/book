import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reconcileBookingPaymentIfNeeded } from "@/lib/payments/reconcile-booking-payment";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string; pageSlug: string }> },
) {
  const { slug: orgSlug, pageSlug } = await params;
  const bookingId = new URL(req.url).searchParams.get("bookingId");
  if (!bookingId) {
    return NextResponse.json({ error: "bookingId obrigatório" }, { status: 400 });
  }

  const found = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      bookingPage: {
        slug: pageSlug,
        organization: { slug: orgSlug },
      },
    },
    select: { id: true },
  });
  if (!found) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  await reconcileBookingPaymentIfNeeded(bookingId);

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true, service: true },
  });
  if (!booking) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    status: booking.status,
    paymentStatus: booking.payment?.status ?? null,
    serviceTitle: booking.service.title,
    startAt: booking.startAt,
    endAt: booking.endAt,
  });
}
