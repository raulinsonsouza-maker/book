import {
  addDays,
  addMinutes,
  format,
  parse,
  startOfDay,
  isBefore,
  isAfter,
  getDay,
} from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";

export type Rule = { dayOfWeek: number; startTime: string; endTime: string };
type Exception = {
  date: string;
  isBlocked: boolean;
  startTime: string | null;
  endTime: string | null;
};

export type SlotWindow = { start: string; end: string; label?: string };

function parseTimeOnDate(dateStr: string, time: string, tz: string) {
  const local = parse(`${dateStr} ${time}`, "yyyy-MM-dd HH:mm", new Date());
  return fromZonedTime(local, tz);
}

function getDayWindows(
  rules: Rule[],
  exceptions: Exception[],
  date: string,
): SlotWindow[] {
  const dayLocal = parse(date, "yyyy-MM-dd", new Date());
  const dow = getDay(dayLocal);

  const blockedFull = exceptions.find((e) => e.isBlocked && !e.startTime);
  if (blockedFull) return [];

  const openEx = exceptions.find((e) => !e.isBlocked && e.startTime && e.endTime);
  if (openEx?.startTime && openEx?.endTime) {
    return [{ start: openEx.startTime, end: openEx.endTime }];
  }

  return rules
    .filter((r) => r.dayOfWeek === dow)
    .map((r) => ({ start: r.startTime, end: r.endTime }))
    .sort((a, b) => a.start.localeCompare(b.start));
}

function generateSlotsForWindows(params: {
  date: string;
  timezone: string;
  windows: SlotWindow[];
  durationMinutes: number;
  bufferBefore: number;
  bufferAfter: number;
  stepMinutes: number;
  partialBlocks: Exception[];
  skipPast?: boolean;
}) {
  const {
    date,
    timezone,
    windows,
    durationMinutes,
    bufferBefore,
    bufferAfter,
    stepMinutes,
    partialBlocks,
    skipPast = true,
  } = params;

  const now = new Date();
  const slots: { startAt: string; endAt: string; label: string; windowIndex: number }[] = [];

  windows.forEach((win, windowIndex) => {
    let cursor = parseTimeOnDate(date, win.start, timezone);
    const windowEnd = parseTimeOnDate(date, win.end, timezone);

    while (isBefore(cursor, windowEnd)) {
      const slotStart = cursor;
      const slotEnd = addMinutes(slotStart, durationMinutes);
      if (isAfter(slotEnd, windowEnd)) break;

      const blocked = partialBlocks.some((b) => {
        const bStart = parseTimeOnDate(date, b.startTime!, timezone);
        const bEnd = parseTimeOnDate(date, b.endTime!, timezone);
        return isBefore(slotStart, bEnd) && isAfter(slotEnd, bStart);
      });

      if (!blocked && (!skipPast || isAfter(slotStart, now))) {
        slots.push({
          startAt: slotStart.toISOString(),
          endAt: slotEnd.toISOString(),
          label: format(toZonedTime(slotStart, timezone), "HH:mm"),
          windowIndex,
        });
      }
      cursor = addMinutes(cursor, stepMinutes);
    }
  });

  return slots;
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

  const windows = getDayWindows(rules, exceptions, params.date);
  const partialBlocks = exceptions.filter(
    (e) => e.isBlocked && e.startTime && e.endTime,
  ) as Exception[];

  const stepMinutes =
    params.slotStepMinutes && params.slotStepMinutes > 0
      ? params.slotStepMinutes
      : params.durationMinutes + (params.bufferBefore || 0) + (params.bufferAfter || 0);

  const slots = generateSlotsForWindows({
    date: params.date,
    timezone: params.timezone,
    windows,
    durationMinutes: params.durationMinutes,
    bufferBefore: params.bufferBefore || 0,
    bufferAfter: params.bufferAfter || 0,
    stepMinutes,
    partialBlocks,
    skipPast: false,
  });

  const byWindow = windows.map((win, i) => ({
    ...win,
    slots: slots.filter((s) => s.windowIndex === i).map((s) => s.label),
    count: slots.filter((s) => s.windowIndex === i).length,
  }));

  return { windows: byWindow, slots, total: slots.length };
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
  return [2, 3, 4].map((dayOfWeek) => ({
    dayOfWeek,
    startTime: "08:00",
    endTime: "17:00",
  }));
}
