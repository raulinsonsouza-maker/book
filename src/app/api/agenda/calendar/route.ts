import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTheoreticalSlots, getBusyIntervals } from "@/lib/availability";
import { getGoogleBusyIntervals } from "@/lib/google/calendar";
import { addDays, parseISO, startOfDay, endOfDay } from "date-fns";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const bookingPageId = searchParams.get("bookingPageId");
  const serviceId = searchParams.get("serviceId");

  if (!from || !to || !bookingPageId || !serviceId) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const page = await prisma.bookingPage.findFirst({
    where: { id: bookingPageId, organizationId: session.user.organizationId },
    include: { organization: true },
  });
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const service = await prisma.service.findFirst({
    where: { id: serviceId, bookingPageId: page.id },
  });
  if (!service) return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });

  const fromDate = parseISO(from);
  const toDate = parseISO(to);

  const bookings = await prisma.booking.findMany({
    where: {
      bookingPageId: page.id,
      startAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) },
      status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
    },
    include: { service: true, payment: true },
    orderBy: { startAt: "asc" },
  });

  const availableSlots: {
    date: string;
    startAt: string;
    endAt: string;
    label: string;
  }[] = [];

  let d = startOfDay(fromDate);
  while (d <= toDate) {
    const dateStr = d.toISOString().slice(0, 10);
    const { slots } = await getTheoreticalSlots({
      bookingPageId: page.id,
      date: dateStr,
      timezone: page.timezone,
      durationMinutes: service.durationMinutes,
      bufferBefore: service.bufferBefore,
      bufferAfter: service.bufferAfter,
      slotStepMinutes: page.slotStepMinutes,
    });
    const busy = await getBusyIntervals({
      bookingPageId: page.id,
      date: dateStr,
      timezone: page.timezone,
      bufferBefore: service.bufferBefore,
      bufferAfter: service.bufferAfter,
    });
    for (const slot of slots) {
      const s = new Date(slot.startAt);
      const e = new Date(slot.endAt);
      const conflict = busy.some((b) => s < b.end && e > b.start);
      const booked = bookings.some(
        (b) =>
          b.status !== "CANCELLED" &&
          b.startAt.toISOString() === slot.startAt,
      );
      if (!conflict && !booked) {
        availableSlots.push({
          date: dateStr,
          startAt: slot.startAt,
          endAt: slot.endAt,
          label: slot.label,
        });
      }
    }
    d = addDays(d, 1);
  }

  let googleBusy: { start: string; end: string }[] = [];
  if (page.organization.googleRefreshToken || page.organization.googleAccessToken) {
    const intervals = await getGoogleBusyIntervals({
      org: page.organization,
      timeMin: startOfDay(fromDate),
      timeMax: endOfDay(toDate),
    });
    googleBusy = intervals.map((i) => ({
      start: i.start.toISOString(),
      end: i.end.toISOString(),
    }));
  }

  return NextResponse.json({
    bookings: bookings.map((b) => ({
      id: b.id,
      status: b.status,
      startAt: b.startAt.toISOString(),
      endAt: b.endAt.toISOString(),
      customerName: b.customerName,
      customerEmail: b.customerEmail,
      serviceTitle: b.service.title,
      googleEventId: b.googleEventId,
      paymentStatus: b.payment?.status,
    })),
    availableSlots,
    googleBusy,
    timezone: page.timezone,
  });
}
