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

type Rule = { dayOfWeek: number; startTime: string; endTime: string };
type Exception = {
  date: string;
  isBlocked: boolean;
  startTime: string | null;
  endTime: string | null;
};

function parseTimeOnDate(dateStr: string, time: string, tz: string) {
  const local = parse(`${dateStr} ${time}`, "yyyy-MM-dd HH:mm", new Date());
  return fromZonedTime(local, tz);
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
    const dow = getDay(day);
    const ex = exceptions.find((e) => e.date === dateStr);
    if (ex?.isBlocked && !ex.startTime) continue;
    const hasRule = rules.some((r) => r.dayOfWeek === dow);
    if (!hasRule && !(ex && !ex.isBlocked && ex.startTime)) continue;
    available.push(dateStr);
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
}) {
  const {
    bookingPageId,
    serviceId,
    date,
    timezone,
    durationMinutes,
    bufferBefore = 0,
    bufferAfter = 0,
  } = params;

  const rules = await prisma.availabilityRule.findMany({
    where: { bookingPageId },
  });
  const exceptions = await prisma.availabilityException.findMany({
    where: { bookingPageId, date },
  });

  const dayLocal = parse(date, "yyyy-MM-dd", new Date());
  const dow = getDay(dayLocal);

  let windows: { start: string; end: string }[] = [];
  const blockedFull = exceptions.find((e) => e.isBlocked && !e.startTime);
  if (blockedFull) return [];

  const openEx = exceptions.find((e) => !e.isBlocked && e.startTime && e.endTime);
  if (openEx?.startTime && openEx?.endTime) {
    windows = [{ start: openEx.startTime, end: openEx.endTime }];
  } else {
    windows = rules
      .filter((r) => r.dayOfWeek === dow)
      .map((r) => ({ start: r.startTime, end: r.endTime }));
  }

  const partialBlocks = exceptions.filter(
    (e) => e.isBlocked && e.startTime && e.endTime,
  ) as Exception[];

  const now = new Date();
  const slots: { startAt: string; endAt: string; label: string }[] = [];

  for (const win of windows) {
    let cursor = parseTimeOnDate(date, win.start, timezone);
    const windowEnd = parseTimeOnDate(date, win.end, timezone);

    while (
      isBefore(addMinutes(cursor, durationMinutes + bufferAfter), windowEnd) ||
      +addMinutes(cursor, durationMinutes) === +windowEnd
    ) {
      const slotStart = cursor;
      const slotEnd = addMinutes(slotStart, durationMinutes);
      if (isAfter(slotEnd, windowEnd)) break;

      const blocked = partialBlocks.some((b) => {
        const bStart = parseTimeOnDate(date, b.startTime!, timezone);
        const bEnd = parseTimeOnDate(date, b.endTime!, timezone);
        return isBefore(slotStart, bEnd) && isAfter(slotEnd, bStart);
      });

      if (!blocked && isAfter(slotStart, now)) {
        slots.push({
          startAt: slotStart.toISOString(),
          endAt: slotEnd.toISOString(),
          label: format(toZonedTime(slotStart, timezone), "HH:mm"),
        });
      }
      cursor = addMinutes(cursor, 30);
    }
  }

  const busy = await getBusyIntervals({
    bookingPageId,
    serviceId,
    date,
    timezone,
    bufferBefore,
    bufferAfter,
  });

  return slots.filter((slot) => {
    const s = new Date(slot.startAt);
    const e = new Date(slot.endAt);
    return !busy.some(
      (b) => isBefore(s, b.end) && isAfter(e, b.start),
    );
  });
}

async function getBusyIntervals(params: {
  bookingPageId: string;
  serviceId: string;
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
        {
          status: "PENDING_PAYMENT",
          holdExpiresAt: { gt: now },
        },
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

export function defaultWeekRules(): Rule[] {
  // Tue, Wed, Thu — 08:00–17:00 (like Lion Tax example)
  return [2, 3, 4].map((dayOfWeek) => ({
    dayOfWeek,
    startTime: "08:00",
    endTime: "17:00",
  }));
}
