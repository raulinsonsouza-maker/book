import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTheoreticalSlots, getBusyIntervals } from "@/lib/availability";
import { getGoogleCalendarEvents } from "@/lib/google/calendar";
import {
  apiAuthContext,
  bookingScopeWhere,
  isProfessionalRole,
  resolveProfessionalScope,
} from "@/lib/rbac";
import { addDays, parseISO, startOfDay, endOfDay } from "date-fns";

export async function GET(req: Request) {
  const auth = await apiAuthContext();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const bookingPageId = searchParams.get("bookingPageId");
  const serviceId = searchParams.get("serviceId");
  const professionalIdParam = searchParams.get("professionalId");

  if (!from || !to || !bookingPageId || !serviceId) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const page = await prisma.bookingPage.findFirst({
    where: { id: bookingPageId, organizationId: ctx.organizationId },
    include: { organization: true },
  });
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const service = await prisma.service.findFirst({
    where: { id: serviceId, bookingPageId: page.id },
  });
  if (!service) {
    return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });
  }

  const professionalId = resolveProfessionalScope(ctx, professionalIdParam);

  if (isProfessionalRole(ctx.role) && ctx.professionalId) {
    const linked = await prisma.professionalService.findFirst({
      where: {
        professionalId: ctx.professionalId,
        serviceId: service.id,
        professional: { isActive: true },
      },
    });
    if (!linked) {
      return NextResponse.json(
        { error: "Sem permissão para este serviço" },
        { status: 403 },
      );
    }
  } else if (professionalId) {
    const pro = await prisma.professional.findFirst({
      where: {
        id: professionalId,
        organizationId: ctx.organizationId,
        isActive: true,
      },
    });
    if (!pro) {
      return NextResponse.json(
        { error: "Profissional não encontrado" },
        { status: 404 },
      );
    }
  }

  const fromDate = parseISO(from);
  const toDate = parseISO(to);

  const bookings = await prisma.booking.findMany({
    where: {
      ...bookingScopeWhere(ctx),
      bookingPageId: page.id,
      ...(professionalId && !isProfessionalRole(ctx.role)
        ? { professionalId }
        : {}),
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
      professionalId,
    });
    const busy = await getBusyIntervals({
      bookingPageId: page.id,
      date: dateStr,
      timezone: page.timezone,
      bufferBefore: service.bufferBefore,
      bufferAfter: service.bufferAfter,
      professionalId,
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

  const googleConnected =
    !professionalId &&
    Boolean(
      page.organization.googleRefreshToken || page.organization.googleAccessToken,
    );

  const syncedGoogleIds = new Set(
    bookings.map((b) => b.googleEventId).filter(Boolean) as string[],
  );

  let googleEvents: {
    id: string;
    summary: string;
    startAt: string;
    endAt: string;
    htmlLink: string | null;
  }[] = [];

  if (googleConnected) {
    const events = await getGoogleCalendarEvents({
      org: page.organization,
      timeMin: startOfDay(fromDate),
      timeMax: endOfDay(toDate),
    });
    googleEvents = events
      .filter((ev) => !syncedGoogleIds.has(ev.id))
      .map((ev) => ({
        id: ev.id,
        summary: ev.summary,
        startAt: ev.start.toISOString(),
        endAt: ev.end.toISOString(),
        htmlLink: ev.htmlLink,
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
    googleEvents,
    googleConnected,
    timezone: page.timezone,
    professionalId,
  });
}
