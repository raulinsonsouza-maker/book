import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitBookingEvent } from "@/lib/events/booking-events";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q")?.trim();
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const bookingPageId = searchParams.get("bookingPageId");

  const bookings = await prisma.booking.findMany({
    where: {
      bookingPage: {
        organizationId: session.user.organizationId,
        ...(bookingPageId ? { id: bookingPageId } : {}),
      },
      ...(status ? { status: status as "CONFIRMED" | "PENDING_PAYMENT" | "CANCELLED" | "EXPIRED" } : {}),
      ...(from || to
        ? {
            startAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { customerName: { contains: q } },
              { customerEmail: { contains: q } },
            ],
          }
        : {}),
    },
    include: {
      service: true,
      bookingPage: { select: { title: true, slug: true } },
      payment: true,
    },
    orderBy: { startAt: "desc" },
    take: 200,
  });
  return NextResponse.json(bookings);
}

const cancelSchema = z.object({ id: z.string() });

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = cancelSchema.parse(await req.json());
    const booking = await prisma.booking.findFirst({
      where: {
        id,
        bookingPage: { organizationId: session.user.organizationId },
      },
      include: {
        bookingPage: true,
      },
    });
    if (!booking) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (booking.status === "CANCELLED") {
      return NextResponse.json(booking);
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    await prisma.slotHold.deleteMany({ where: { bookingId: id } });

    await emitBookingEvent({
      type: "booking.cancelled",
      organizationId: booking.bookingPage.organizationId,
      bookingId: id,
      dedupeKey: `cancel-${id}`,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Erro" }, { status: 400 });
  }
}
