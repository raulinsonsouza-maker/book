import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteCalendarEvent } from "@/lib/google/calendar";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const bookings = await prisma.booking.findMany({
    where: {
      bookingPage: { organizationId: session.user.organizationId },
      ...(status ? { status: status as "CONFIRMED" } : {}),
    },
    include: {
      service: true,
      bookingPage: { select: { title: true, slug: true } },
      payment: true,
    },
    orderBy: { startAt: "asc" },
    take: 100,
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
        bookingPage: { include: { organization: true } },
      },
    });
    if (!booking) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const updated = await prisma.booking.update({
      where: { id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    await prisma.slotHold.deleteMany({ where: { bookingId: id } });

    if (booking.googleEventId) {
      void deleteCalendarEvent({
        org: booking.bookingPage.organization,
        eventId: booking.googleEventId,
      });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Erro" }, { status: 400 });
  }
}
