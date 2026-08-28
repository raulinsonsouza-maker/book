"use client";

import {
  addDays,
  addWeeks,
  format,
  parseISO,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCallback, useEffect, useState } from "react";

type BookingItem = {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  customerName: string;
  serviceTitle: string;
  googleEventId?: string | null;
};

type SlotItem = {
  date: string;
  startAt: string;
  endAt: string;
  label: string;
};

type PageOption = { id: string; title: string; slug: string };
type ServiceOption = { id: string; title: string; durationMinutes: number };

const HOUR_START = 7;
const HOUR_END = 20;
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);

function topPx(iso: string, weekStart: Date) {
  const d = parseISO(iso);
  const dayIndex = Math.floor(
    (d.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000),
  );
  const hours = d.getHours() + d.getMinutes() / 60;
  const top = (hours - HOUR_START) * 48;
  return { dayIndex, top: Math.max(0, top) };
}

function heightPx(startAt: string, endAt: string) {
  const ms = parseISO(endAt).getTime() - parseISO(startAt).getTime();
  return Math.max(24, (ms / 3600000) * 48);
}

type Props = {
  pages: PageOption[];
  initialPageId: string;
  initialServiceId: string;
};

export function WeekCalendar({
  pages,
  initialPageId,
  initialServiceId,
}: Props) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 0 }),
  );
  const [pageId, setPageId] = useState(initialPageId);
  const [serviceId, setServiceId] = useState(initialServiceId);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [googleBusy, setGoogleBusy] = useState<{ start: string; end: string }[]>([]);
  const [showGoogle, setShowGoogle] = useState(true);
  const [showSlots, setShowSlots] = useState(true);

  const weekEnd = addDays(weekStart, 6);
  const from = format(weekStart, "yyyy-MM-dd");
  const to = format(weekEnd, "yyyy-MM-dd");

  useEffect(() => {
    fetch(`/api/pages/${pageId}`)
      .then((r) => r.json())
      .then((p) => {
        setServices(p.services || []);
        if (!p.services?.find((s: ServiceOption) => s.id === serviceId)) {
          setServiceId(p.services?.[0]?.id || "");
        }
      });
  }, [pageId, serviceId]);

  const load = useCallback(() => {
    if (!pageId || !serviceId) return;
    fetch(
      `/api/agenda/calendar?from=${from}&to=${to}&bookingPageId=${pageId}&serviceId=${serviceId}`,
    )
      .then((r) => r.json())
      .then((data) => {
        setBookings(data.bookings || []);
        setSlots(data.availableSlots || []);
        setGoogleBusy(data.googleBusy || []);
      });
  }, [from, to, pageId, serviceId]);

  useEffect(() => {
    load();
  }, [load]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setWeekStart(subWeeks(weekStart, 1))}
            className="btn-secondary !py-1.5"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))}
            className="btn-secondary !py-1.5"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(addWeeks(weekStart, 1))}
            className="btn-secondary !py-1.5"
          >
            →
          </button>
        </div>
        <span className="text-sm font-medium capitalize">
          {format(weekStart, "d MMM", { locale: ptBR })} –{" "}
          {format(weekEnd, "d MMM yyyy", { locale: ptBR })}
        </span>
        <select
          className="input-field !w-auto"
          value={pageId}
          onChange={(e) => setPageId(e.target.value)}
        >
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <select
          className="input-field !w-auto"
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={showSlots}
            onChange={(e) => setShowSlots(e.target.checked)}
          />
          Slots livres
        </label>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={showGoogle}
            onChange={(e) => setShowGoogle(e.target.checked)}
          />
          Google ocupado
        </label>
      </div>

      <div className="surface overflow-x-auto">
        <div className="grid min-w-[800px] grid-cols-[48px_repeat(7,1fr)] border-b border-border">
          <div />
          {days.map((d) => (
            <div
              key={d.toISOString()}
              className="border-l border-border px-2 py-2 text-center text-xs font-medium"
            >
              <div className="text-muted">{format(d, "EEE", { locale: ptBR })}</div>
              <div>{format(d, "d")}</div>
            </div>
          ))}
        </div>
        <div className="relative grid min-w-[800px] grid-cols-[48px_repeat(7,1fr)]">
          <div className="border-r border-border">
            {HOURS.map((h) => (
              <div
                key={h}
                className="h-12 border-b border-border pr-1 text-right text-[10px] text-muted"
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {days.map((day, colIdx) => (
            <div key={day.toISOString()} className="relative border-r border-border">
              {HOURS.map((h) => (
                <div key={h} className="h-12 border-b border-border bg-white/50" />
              ))}
              {showGoogle &&
                googleBusy.map((g, i) => {
                  const { dayIndex, top } = topPx(g.start, weekStart);
                  if (dayIndex !== colIdx) return null;
                  return (
                    <div
                      key={`g-${i}`}
                      className="pointer-events-none absolute inset-x-0.5 rounded bg-muted/40"
                      style={{
                        top: `${top}px`,
                        height: `${heightPx(g.start, g.end)}px`,
                      }}
                    />
                  );
                })}
              {showSlots &&
                slots
                  .filter((s) => s.date === format(day, "yyyy-MM-dd"))
                  .map((s, i) => {
                    const { top } = topPx(s.startAt, weekStart);
                    return (
                      <div
                        key={`slot-${i}`}
                        className="absolute inset-x-0.5 rounded border border-dashed border-time-border bg-time-bg/60 px-1 text-[10px] text-time"
                        style={{
                          top: `${top}px`,
                          height: `${heightPx(s.startAt, s.endAt)}px`,
                        }}
                      >
                        {s.label}
                      </div>
                    );
                  })}
              {bookings
                .filter((b) => format(parseISO(b.startAt), "yyyy-MM-dd") === format(day, "yyyy-MM-dd"))
                .map((b) => {
                  const { top } = topPx(b.startAt, weekStart);
                  const confirmed = b.status === "CONFIRMED";
                  return (
                    <div
                      key={b.id}
                      className={`absolute inset-x-0.5 overflow-hidden rounded px-1 py-0.5 text-[10px] leading-tight text-white ${
                        confirmed ? "bg-foreground" : "border-2 border-dashed border-foreground bg-white text-foreground"
                      }`}
                      style={{
                        top: `${top}px`,
                        height: `${heightPx(b.startAt, b.endAt)}px`,
                      }}
                      title={b.customerName}
                    >
                      {b.serviceTitle} — {b.customerName}
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
