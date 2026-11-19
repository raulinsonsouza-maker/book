import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAvailableSlots,
  getTheoreticalSlots,
  getBusyIntervals,
} from "@/lib/availability";
import { getGoogleCalendarEvents } from "@/lib/google/calendar";
import {
  apiAuthContext,
  bookingScopeWhere,
  isAdminRole,
  isProfessionalRole,
  resolveProfessionalScope,
} from "@/lib/rbac";
import { addDays, parseISO, startOfDay, endOfDay } from "date-fns";
import { CALENDAR_VISIBLE_STATUSES } from "@/lib/booking-status";

type SlotOut = {
  date: string;
  startAt: string;
  endAt: string;
  label: string;
  professionalId?: string | null;
};

async function linkedProfessionals(organizationId: string, serviceId?: string) {
  return prisma.professional.findMany({
    where: {
      organizationId,
      isActive: true,
      ...(serviceId ? { services: { some: { serviceId } } } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, displayName: true },
  });
}

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
  const anyone = searchParams.get("anyone") === "1";
  const includeSlots = searchParams.get("includeSlots") !== "0";

  if (!from || !to || !bookingPageId || !serviceId) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const allPages = bookingPageId === "all" || bookingPageId === "__all__";
  const allServices = serviceId === "all" || serviceId === "__all__";

  const organization = await prisma.organization.findFirst({
    where: { id: ctx.organizationId },
  });
  if (!organization) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const page = allPages
    ? null
    : await prisma.bookingPage.findFirst({
        where: { id: bookingPageId, organizationId: ctx.organizationId },
        include: { organization: true },
      });
  if (!allPages && !page) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const service = allServices
    ? null
    : await prisma.service.findFirst({
        where: {
          id: serviceId,
          organizationId: ctx.organizationId,
          ...(page
            ? { pages: { some: { bookingPageId: page.id } } }
            : {}),
        },
      });
  if (!allServices && !service) {
    return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });
  }

  const timezone = page?.timezone || "America/Sao_Paulo";
  const salonMode = organization.businessMode === "SALON";
  const adminSalon = salonMode && isAdminRole(ctx.role);
  const canComputeSlots = includeSlots && Boolean(page && service);

  let professionalId = resolveProfessionalScope(ctx, professionalIdParam);

  if (isProfessionalRole(ctx.role) && ctx.professionalId && service) {
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
  }

  const linkedPros = adminSalon
    ? await linkedProfessionals(ctx.organizationId, service?.id)
    : [];

  if (adminSalon && canComputeSlots) {
    if (linkedPros.length === 0) {
      return NextResponse.json({
        bookings: [],
        availableSlots: [] as SlotOut[],
        googleEvents: [],
        googleConnected: false,
        timezone,
        professionalId: null,
        anyone: false,
        linkedProfessionals: [],
        setupHint: "NO_PROS" as const,
      });
    }

    if (!anyone && !professionalId) {
      // Still return bookings even if slots need a pro filter.
    }

    if (professionalId && !anyone) {
      if (!linkedPros.some((p) => p.id === professionalId)) {
        return NextResponse.json(
          { error: "Profissional não atende este serviço" },
          { status: 400 },
        );
      }
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

  const bookingProFilter =
    professionalId && !anyone
      ? { professionalId }
      : anyone && linkedPros.length
        ? { professionalId: { in: linkedPros.map((p) => p.id) } }
        : {};

  const bookings = await prisma.booking.findMany({
    where: {
      ...bookingScopeWhere(ctx),
      ...(page ? { bookingPageId: page.id } : {}),
      ...(service ? { serviceId: service.id } : {}),
      ...(adminSalon && (anyone || professionalId) ? bookingProFilter : {}),
      ...(!adminSalon && professionalId && !isProfessionalRole(ctx.role)
        ? { professionalId }
        : {}),
      startAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) },
      status: { in: [...CALENDAR_VISIBLE_STATUSES] },
    },
    include: {
      service: true,
      payment: true,
      professional: true,
      bookingPage: { select: { title: true } },
    },
    orderBy: { startAt: "asc" },
  });

  const availableSlots: SlotOut[] = [];
  let setupHint: "NO_PROS" | "NO_HOURS" | "NEED_PRO_FILTER" | null = null;

  if (canComputeSlots && page && service) {
    if (adminSalon && linkedPros.length === 0) {
      setupHint = "NO_PROS";
    } else if (adminSalon && !anyone && !professionalId) {
      setupHint = "NEED_PRO_FILTER";
    } else {
      const slotParamsBase = {
        bookingPageId: page.id,
        serviceId: service.id,
        timezone: page.timezone,
        durationMinutes: service.durationMinutes,
        bufferBefore: service.bufferBefore,
        bufferAfter: service.bufferAfter,
        slotStepMinutes: page.slotStepMinutes,
      };

      let d = startOfDay(fromDate);
      while (d <= toDate) {
        const dateStr = d.toISOString().slice(0, 10);

        if (adminSalon && anyone) {
          const byStart = new Map<string, SlotOut>();
          for (const pro of linkedPros) {
            const slots = await getAvailableSlots({
              ...slotParamsBase,
              date: dateStr,
              professionalId: pro.id,
            });
            for (const slot of slots) {
              if (!byStart.has(slot.startAt)) {
                byStart.set(slot.startAt, {
                  date: dateStr,
                  startAt: slot.startAt,
                  endAt: slot.endAt,
                  label: slot.label,
                  professionalId: pro.id,
                });
              }
            }
          }
          availableSlots.push(
            ...[...byStart.values()].sort(
              (a, b) =>
                new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
            ),
          );
        } else if (adminSalon && professionalId) {
          const slots = await getAvailableSlots({
            ...slotParamsBase,
            date: dateStr,
            professionalId,
          });
          for (const slot of slots) {
            availableSlots.push({
              date: dateStr,
              startAt: slot.startAt,
              endAt: slot.endAt,
              label: slot.label,
              professionalId,
            });
          }
        } else {
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
                professionalId: professionalId || null,
              });
            }
          }
        }

        d = addDays(d, 1);
      }

      if (adminSalon && linkedPros.length > 0 && availableSlots.length === 0) {
        const targetIds = anyone
          ? linkedPros.map((p) => p.id)
          : professionalId
            ? [professionalId]
            : [];
        if (targetIds.length) {
          const rules = await prisma.availabilityRule.count({
            where: { professionalId: { in: targetIds } },
          });
          if (rules === 0) setupHint = "NO_HOURS";
        }
      }
    }
  }

  const googleConnected =
    !isProfessionalRole(ctx.role) &&
    Boolean(organization.googleRefreshToken || organization.googleAccessToken);

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
      org: organization,
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
      timezone: b.timezone,
      customerId: b.customerId ?? null,
      customerName: b.customerName,
      customerEmail: b.customerEmail,
      customerPhone: b.customerPhone,
      serviceTitle: b.service.title,
      serviceImageUrl: b.service.imageUrl ?? null,
      serviceDurationMinutes: b.service.durationMinutes,
      professionalName: b.professional?.displayName ?? null,
      professionalPhotoUrl: b.professional?.photoUrl ?? null,
      pageTitle: b.bookingPage.title,
      confirmedAt: b.confirmedAt?.toISOString() ?? null,
      arrivedAt: b.arrivedAt?.toISOString() ?? null,
      completedAt: b.completedAt?.toISOString() ?? null,
      cancelledAt: b.cancelledAt?.toISOString() ?? null,
      cancelSource: b.cancelSource ?? null,
      createdAt: b.createdAt.toISOString(),
      googleEventId: b.googleEventId,
      googleMeetLink: b.googleMeetLink,
      paymentStatus: b.payment?.status ?? null,
      paymentMethod: b.payment?.method ?? null,
      paymentAmountCents: b.payment?.amountCents ?? null,
    })),
    availableSlots,
    googleEvents,
    googleConnected,
    timezone,
    professionalId: anyone ? null : professionalId,
    anyone: adminSalon && anyone,
    linkedProfessionals: linkedPros,
    setupHint,
  });
}
