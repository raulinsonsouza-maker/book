import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const bookingId = new URL(req.url).searchParams.get("bookingId");
  if (!bookingId) {
    return NextResponse.json({ error: "bookingId obrigatório" }, { status: 400 });
  }

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, bookingPage: { slug } },
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
