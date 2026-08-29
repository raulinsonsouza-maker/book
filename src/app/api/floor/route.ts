import { NextResponse } from "next/server";
import { format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import {
  apiAuthContext,
  isAdminRole,
  isProfessionalRole,
} from "@/lib/rbac";

export async function GET(req: Request) {
  const auth = await apiAuthContext();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { timezone: true, businessMode: true, name: true },
  });
  if (!org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const timezone = org.timezone || "America/Sao_Paulo";
  const now = new Date();
  const zonedNow = toZonedTime(now, timezone);
  const dateStr = dateParam || format(zonedNow, "yyyy-MM-dd");

  const dayStartUtc = fromZonedTime(
    new Date(
      Number(dateStr.slice(0, 4)),
      Number(dateStr.slice(5, 7)) - 1,
      Number(dateStr.slice(8, 10)),
      0,
      0,
      0,
      0,
    ),
    timezone,
  );
  const dayEndUtc = fromZonedTime(
    new Date(
      Number(dateStr.slice(0, 4)),
      Number(dateStr.slice(5, 7)) - 1,
      Number(dateStr.slice(8, 10)),
      23,
      59,
      59,
      999,
    ),
    timezone,
  );

  const statusFilter = ["CONFIRMED", "PENDING_PAYMENT"] as (
    | "CONFIRMED"
    | "PENDING_PAYMENT"
  )[];

  const bookingWhere = {
    bookingPage: { organizationId: ctx.organizationId },
    startAt: { gte: dayStartUtc, lte: dayEndUtc },
    status: { in: statusFilter },
  };

  if (org.businessMode === "SALON") {
    const pros = await prisma.professional.findMany({
      where: {
        organizationId: ctx.organizationId,
        isActive: true,
        ...(isProfessionalRole(ctx.role) && ctx.professionalId
          ? { id: ctx.professionalId }
          : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }],
      select: {
        id: true,
        displayName: true,
        photoUrl: true,
      },
    });

    const bookings = await prisma.booking.findMany({
      where: {
        ...bookingWhere,
        professionalId: { in: pros.map((p) => p.id) },
      },
      include: {
        service: {
          select: { title: true, description: true, durationMinutes: true },
        },
        bookingPage: { select: { title: true, funnelConfig: true } },
      },
      orderBy: { startAt: "asc" },
    });

    type B = (typeof bookings)[number];
    const byPro = new Map<string, B[]>();
    for (const b of bookings) {
      if (!b.professionalId) continue;
      const list = byPro.get(b.professionalId) || [];
      list.push(b);
      byPro.set(b.professionalId, list);
    }

    return NextResponse.json({
      date: dateStr,
      timezone,
      orgName: org.name,
      serverNow: now.toISOString(),
      mode: "SALON" as const,
      professionals: pros.map((p) => {
        const list = byPro.get(p.id) || [];
        return {
          id: p.id,
          displayName: p.displayName,
          photoUrl: p.photoUrl,
          bookings: list.map((b) => serializeFloorBooking(b)),
        };
      }),
    });
  }

  if (!isAdminRole(ctx.role) && isProfessionalRole(ctx.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const bookings = await prisma.booking.findMany({
    where: bookingWhere,
    include: {
      service: {
        select: { title: true, description: true, durationMinutes: true },
      },
      bookingPage: { select: { title: true, funnelConfig: true } },
    },
    orderBy: { startAt: "asc" },
  });

  return NextResponse.json({
    date: dateStr,
    timezone,
    orgName: org.name,
    serverNow: now.toISOString(),
    mode: "SOLO" as const,
    professionals: [
      {
        id: "solo",
        displayName: org.name,
        photoUrl: null,
        bookings: bookings.map((b) => serializeFloorBooking(b)),
      },
    ],
  });
}

function fieldLabelsFromFunnel(funnelConfig: string | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!funnelConfig) return map;
  try {
    const parsed = JSON.parse(funnelConfig) as {
      formFields?: { id?: string; label?: string }[];
    };
    for (const f of parsed.formFields || []) {
      if (f.id && f.label) map.set(f.id, f.label);
    }
  } catch {
    /* ignore */
  }
  return map;
}

function parseCustomAnswers(
  raw: string | null,
  funnelConfig: string | null,
): { label: string; value: string }[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return [];
    }
    const labels = fieldLabelsFromFunnel(funnelConfig);
    return Object.entries(parsed as Record<string, unknown>)
      .map(([key, value]) => ({
        label: labels.get(key) || key,
        value: value == null ? "" : String(value),
      }))
      .filter((a) => a.value.trim().length > 0);
  } catch {
    return [];
  }
}

function serializeFloorBooking(b: {
  id: string;
  startAt: Date;
  endAt: Date;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCpf: string | null;
  customAnswers: string | null;
  service: {
    title: string;
    description: string | null;
    durationMinutes: number;
  };
  bookingPage: { title: string; funnelConfig: string | null };
}) {
  return {
    id: b.id,
    startAt: b.startAt.toISOString(),
    endAt: b.endAt.toISOString(),
    status: b.status,
    customerName: b.customerName,
    customerEmail: b.customerEmail,
    customerPhone: b.customerPhone,
    customerCpf: b.customerCpf,
    serviceTitle: b.service.title,
    serviceDescription: b.service.description,
    durationMinutes: b.service.durationMinutes,
    pageTitle: b.bookingPage.title,
    customAnswers: parseCustomAnswers(b.customAnswers, b.bookingPage.funnelConfig),
  };
}
