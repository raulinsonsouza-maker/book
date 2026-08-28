import {
  addDays,
  addMinutes,
  format,
  startOfDay,
  isBefore,
  isAfter,
} from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import {
  computeTheoreticalSlots,
  getDayWindows,
  normalizeRules,
  parseTimeOnDate,
  type Rule,
} from "@/lib/availability-core";

export type { Rule } from "@/lib/availability-core";

type Exception = {
  date: string;
  isBlocked: boolean;
  startTime: string | null;
  endTime: string | null;
};

export function filterSlotsByBusy<T extends { startAt: string; endAt: string }>(
  slots: T[],
  busy: { start: Date; end: Date }[],
): T[] {
  return slots.filter((slot) => {
    const s = new Date(slot.startAt);
    const e = new Date(slot.endAt);
    return !busy.some((b) => isBefore(s, b.end) && isAfter(e, b.start));
  });
}

export async function getBusyIntervals(params: {
  bookingPageId: string;
  date: string;
  timezone: string;
  bufferBefore: number;
  bufferAfter: number;
}) {
  const dayStart = parseTimeOnDate(params.date, "00:00", params.timezone);
  const dayEnd = parseTimeOnDate(params.date, "23:59", params.timezone);
  const now = new Date();

  const page = await prisma.bookingPage.findUnique({
    where: { id: params.bookingPageId },
    include: { organization: true },
  });

  const bookings = await prisma.booking.findMany({
    where: {
      bookingPageId: params.bookingPageId,
      startAt: { gte: dayStart, lte: dayEnd },
      OR: [
        { status: "CONFIRMED" },
        { status: "PENDING_PAYMENT", holdExpiresAt: { gt: now } },
      ],
    },
  });

  const holds = await prisma.slotHold.findMany({
    where: {
      bookingPageId: params.bookingPageId,
      startAt: { gte: dayStart, lte: dayEnd },
      expiresAt: { gt: now },
      bookingId: null,
    },
  });

  const intervals = [
    ...bookings.map((b) => ({
      start: addMinutes(b.startAt, -params.bufferBefore),
      end: addMinutes(b.endAt, params.bufferAfter),
    })),
    ...holds.map((h) => ({
      start: addMinutes(h.startAt, -params.bufferBefore),
      end: addMinutes(h.endAt, params.bufferAfter),
    })),
  ];

  if (page?.organization) {
    const { getGoogleBusyIntervals } = await import("@/lib/google/calendar");
    const googleBusy = await getGoogleBusyIntervals({
      org: page.organization,
      timeMin: dayStart,
      timeMax: dayEnd,
    });
    for (const b of googleBusy) {
      intervals.push({
        start: addMinutes(b.start, -params.bufferBefore),
        end: addMinutes(b.end, params.bufferAfter),
      });
    }
  }

  return intervals;
}

export async function getTheoreticalSlots(params: {
  bookingPageId: string;
  date: string;
  timezone: string;
  durationMinutes: number;
  bufferBefore?: number;
  bufferAfter?: number;
  slotStepMinutes?: number;
}) {
  const rules = await prisma.availabilityRule.findMany({
    where: { bookingPageId: params.bookingPageId },
  });
  const exceptions = await prisma.availabilityException.findMany({
    where: { bookingPageId: params.bookingPageId, date: params.date },
  });

  return computeTheoreticalSlots({
    rules,
    exceptions,
    date: params.date,
    timezone: params.timezone,
    durationMinutes: params.durationMinutes,
    bufferBefore: params.bufferBefore,
    bufferAfter: params.bufferAfter,
    slotStepMinutes: params.slotStepMinutes,
    skipPast: false,
  });
}

export async function getAvailableDays(params: {
  bookingPageId: string;
  from: Date;
  days?: number;
  timezone: string;
}) {
  const { bookingPageId, from, timezone, days = 60 } = params;
  const rules = await prisma.availabilityRule.findMany({
    where: { bookingPageId },
  });
  const exceptions = await prisma.availabilityException.findMany({
    where: { bookingPageId },
  });

  const available: string[] = [];
  const start = startOfDay(toZonedTime(from, timezone));

  for (let i = 0; i < days; i++) {
    const day = addDays(start, i);
    const dateStr = format(day, "yyyy-MM-dd");
    const windows = getDayWindows(rules, exceptions, dateStr);
    if (windows.length > 0) available.push(dateStr);
  }
  return available;
}

export async function getAvailableSlots(params: {
  bookingPageId: string;
  serviceId: string;
  date: string;
  timezone: string;
  durationMinutes: number;
  bufferBefore?: number;
  bufferAfter?: number;
  slotStepMinutes?: number;
}) {
  const {
    bookingPageId,
    serviceId,
    date,
    timezone,
    durationMinutes,
    bufferBefore = 0,
    bufferAfter = 0,
    slotStepMinutes = 0,
  } = params;

  const page = await prisma.bookingPage.findUnique({
    where: { id: bookingPageId },
  });
  const step =
    slotStepMinutes > 0
      ? slotStepMinutes
      : page?.slotStepMinutes && page.slotStepMinutes > 0
        ? page.slotStepMinutes
        : durationMinutes + bufferBefore + bufferAfter;

  const { slots } = await getTheoreticalSlots({
    bookingPageId,
    date,
    timezone,
    durationMinutes,
    bufferBefore,
    bufferAfter,
    slotStepMinutes: step,
  });

  const busy = await getBusyIntervals({
    bookingPageId,
    date,
    timezone,
    bufferBefore,
    bufferAfter,
  });

  const available = filterSlotsByBusy(
    slots.filter((s) => isAfter(new Date(s.startAt), new Date())),
    busy,
  );

  return available.map(({ startAt, endAt, label }) => ({ startAt, endAt, label }));
}

export async function isSlotAvailable(params: {
  bookingPageId: string;
  serviceId: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
  durationMinutes: number;
  bufferBefore?: number;
  bufferAfter?: number;
}) {
  const date = format(toZonedTime(params.startAt, params.timezone), "yyyy-MM-dd");
  const slots = await getAvailableSlots({
    bookingPageId: params.bookingPageId,
    serviceId: params.serviceId,
    date,
    timezone: params.timezone,
    durationMinutes: params.durationMinutes,
    bufferBefore: params.bufferBefore,
    bufferAfter: params.bufferAfter,
  });
  return slots.some((s) => s.startAt === params.startAt.toISOString());
}

export function defaultWeekRules(): Rule[] {
  return [1, 2, 3, 4, 5].map((dayOfWeek) => ({
    dayOfWeek,
    startTime: "08:00",
    endTime: "18:00",
  }));
}

export { computeTheoreticalSlots, normalizeRules };
