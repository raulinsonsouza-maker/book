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

type GoogleEventItem = {
  id: string;
  summary: string;
  startAt: string;
  endAt: string;
  htmlLink: string | null;
};

type PageOption = { id: string; title: string; slug: string };
type ServiceOption = { id: string; title: string; durationMinutes: number };

const HOUR_START = 7;
const HOUR_END = 20;
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);

function topPx(iso: string, weekStart: Date) {
  const d = parseISO(iso);
  const hours = d.getHours() + d.getMinutes() / 60;
  const top = (hours - HOUR_START) * 48;
  return { top: Math.max(0, top) };
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
  const [googleEvents, setGoogleEvents] = useState<GoogleEventItem[]>([]);
  const [googleConnected, setGoogleConnected] = useState(false);
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
        setGoogleEvents(data.googleEvents || []);
        setGoogleConnected(Boolean(data.googleConnected));
      });
  }, [from, to, pageId, serviceId]);

  useEffect(() => {
    load();
  }, [load]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const showPageFilter = pages.length > 1;
  const showServiceFilter = services.length > 1;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setWeekStart(subWeeks(weekStart, 1))}
            className="btn-secondary !px-2.5 !py-1.5"
            aria-label="Semana anterior"
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
            className="btn-secondary !px-2.5 !py-1.5"
            aria-label="Próxima semana"
          >
            →
          </button>
        </div>

        <span className="text-sm font-semibold tracking-tight capitalize">
          {format(weekStart, "d MMM", { locale: ptBR })} –{" "}
          {format(weekEnd, "d MMM yyyy", { locale: ptBR })}
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {showPageFilter && (
            <label className="flex items-center gap-1.5 text-xs text-muted">
              Página
              <select
                className="input-field !w-auto !py-1.5 text-sm"
                value={pageId}
                onChange={(e) => setPageId(e.target.value)}
              >
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          {showServiceFilter && (
            <label className="flex items-center gap-1.5 text-xs text-muted">
              Serviço
              <select
                className="input-field !w-auto !py-1.5 text-sm"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-medium">
            <input
              type="checkbox"
              checked={showSlots}
              onChange={(e) => setShowSlots(e.target.checked)}
              className="accent-amber-500"
            />
            Livres
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-medium">
            <input
              type="checkbox"
              checked={showGoogle}
              onChange={(e) => setShowGoogle(e.target.checked)}
              className="accent-blue-600"
            />
            Google
          </label>
          {!googleConnected && (
            <a
              href="/app/integrations"
              className="text-xs font-medium text-blue-700 underline-offset-2 hover:underline"
            >
              Conectar Google
            </a>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-white px-3 py-2.5 shadow-sm">
        <LegendChip
          swatch="bg-emerald-600"
          label="Confirmado"
        />
        <LegendChip
          swatch="border-2 border-dashed border-amber-500 bg-white"
          label="Aguardando pagamento"
        />
        <LegendChip
          swatch="border-l-[3px] border-blue-600 bg-blue-100"
          label="Google Agenda"
        />
        <LegendChip
          swatch="border border-amber-300 bg-amber-100"
          label="Slot livre"
        />
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
          {days.map((day) => (
            <div key={day.toISOString()} className="relative border-r border-border">
              {HOURS.map((h) => (
                <div key={h} className="h-12 border-b border-border bg-white/50" />
              ))}
              {showGoogle &&
                googleEvents
                  .filter(
                    (ev) =>
                      format(parseISO(ev.startAt), "yyyy-MM-dd") ===
                      format(day, "yyyy-MM-dd"),
                  )
                  .map((ev) => {
                    const { top } = topPx(ev.startAt, weekStart);
                    const inner = (
                      <>
                        <span className="line-clamp-2 font-medium">{ev.summary}</span>
                        <span className="text-[9px] opacity-80">
                          {format(parseISO(ev.startAt), "HH:mm")}–
                          {format(parseISO(ev.endAt), "HH:mm")}
                        </span>
                      </>
                    );
                    const style = {
                      top: `${top}px`,
                      height: `${heightPx(ev.startAt, ev.endAt)}px`,
                    };
                    const className =
                      "absolute inset-x-0.5 z-[2] overflow-hidden rounded border border-blue-200 border-l-[3px] border-l-blue-600 bg-blue-50 px-1 py-0.5 text-[10px] leading-tight text-blue-800";

                    if (ev.htmlLink) {
                      return (
                        <a
                          key={ev.id}
                          href={ev.htmlLink}
                          target="_blank"
                          rel="noreferrer"
                          className={`${className} hover:bg-blue-100`}
                          style={style}
                          title={ev.summary}
                        >
                          {inner}
                        </a>
                      );
                    }

                    return (
                      <div
                        key={ev.id}
                        className={`${className} pointer-events-none`}
                        style={style}
                        title={ev.summary}
                      >
                        {inner}
                      </div>
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
                        className="absolute inset-x-0.5 z-[1] rounded border border-amber-300/80 bg-amber-100/90 px-1 text-[10px] font-medium text-amber-900"
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
                .filter(
                  (b) =>
                    format(parseISO(b.startAt), "yyyy-MM-dd") ===
                    format(day, "yyyy-MM-dd"),
                )
                .map((b) => {
                  const { top } = topPx(b.startAt, weekStart);
                  const confirmed = b.status === "CONFIRMED";
                  return (
                    <div
                      key={b.id}
                      className={`absolute inset-x-0.5 z-[3] overflow-hidden rounded px-1 py-0.5 text-[10px] leading-tight ${
                        confirmed
                          ? "bg-emerald-600 font-medium text-white shadow-sm"
                          : "border-2 border-dashed border-amber-500 bg-white font-medium text-amber-900"
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

function LegendChip({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg bg-[#f7f5f2] px-2.5 py-1.5 text-xs font-medium text-foreground">
      <span className={`h-3.5 w-3.5 shrink-0 rounded-sm ${swatch}`} />
      {label}
    </span>
  );
}
