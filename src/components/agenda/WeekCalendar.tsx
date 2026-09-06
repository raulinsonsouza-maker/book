"use client";

import {
  addDays,
  addWeeks,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ManualBookingModal } from "@/components/agenda/ManualBookingModal";

type BookingItem = {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  customerName: string;
  serviceTitle: string;
  professionalName?: string | null;
  googleEventId?: string | null;
};

type SlotItem = {
  date: string;
  startAt: string;
  endAt: string;
  label: string;
  professionalId?: string | null;
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
type ProOption = { id: string; displayName: string; serviceIds: string[] };

type SetupHint = "NO_PROS" | "NO_HOURS" | "NEED_PRO_FILTER" | null;

const HOUR_START = 7;
const HOUR_END = 20;
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);

/** Sentinel no select: qualquer profissional disponível para o serviço. */
const ANYONE = "__anyone__";

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
  professionalId?: string | null;
  isProfessionalView?: boolean;
  businessMode?: "SOLO" | "SALON";
};

export function WeekCalendar({
  pages,
  initialPageId,
  initialServiceId,
  professionalId = null,
  isProfessionalView = false,
  businessMode = "SOLO",
}: Props) {
  const salonAdmin = businessMode === "SALON" && !isProfessionalView;

  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 0 }),
  );
  const [pageId, setPageId] = useState(initialPageId);
  const [serviceId, setServiceId] = useState(initialServiceId);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [allPros, setAllPros] = useState<ProOption[]>([]);
  /** ANYONE | id do pro — só usado em SALON admin */
  const [proFilter, setProFilter] = useState<string>(ANYONE);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [googleEvents, setGoogleEvents] = useState<GoogleEventItem[]>([]);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [showGoogle, setShowGoogle] = useState(true);
  const [showSlots, setShowSlots] = useState(true);
  const [loadingCal, setLoadingCal] = useState(false);
  const [calError, setCalError] = useState("");
  const [setupHint, setSetupHint] = useState<SetupHint>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);
  const [manualSlot, setManualSlot] = useState<SlotItem | null>(null);

  const weekEnd = addDays(weekStart, 6);
  const from = format(weekStart, "yyyy-MM-dd");
  const to = format(weekEnd, "yyyy-MM-dd");

  const prosForService = useMemo(
    () => allPros.filter((p) => p.serviceIds.includes(serviceId)),
    [allPros, serviceId],
  );

  useEffect(() => {
    fetch(`/api/pages/${pageId}`)
      .then((r) => r.json())
      .then((p) => {
        const list = (p.services || []).filter(
          (s: ServiceOption & { isActive?: boolean }) => s.isActive !== false,
        );
        setServices(list);
        if (!list.find((s: ServiceOption) => s.id === serviceId)) {
          setServiceId(list[0]?.id || "");
        }
      });
  }, [pageId, serviceId]);

  useEffect(() => {
    if (!salonAdmin) return;
    fetch("/api/professionals")
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        setAllPros(
          data
            .filter((p: { isActive: boolean }) => p.isActive)
            .map(
              (p: {
                id: string;
                displayName: string;
                serviceIds: string[];
              }) => ({
                id: p.id,
                displayName: p.displayName,
                serviceIds: p.serviceIds || [],
              }),
            ),
        );
      })
      .catch(() => undefined);
  }, [salonAdmin]);

  useEffect(() => {
    if (!salonAdmin) return;
    if (proFilter !== ANYONE && !prosForService.some((p) => p.id === proFilter)) {
      setProFilter(prosForService.length === 1 ? prosForService[0]!.id : ANYONE);
    }
  }, [salonAdmin, serviceId, prosForService, proFilter]);

  const load = useCallback(() => {
    if (!pageId || !serviceId) return;
    if (salonAdmin && prosForService.length === 0 && allPros.length > 0) {
      setBookings([]);
      setSlots([]);
      setSetupHint("NO_PROS");
      setCalError("");
      return;
    }

    setLoadingCal(true);
    setCalError("");
    const params = new URLSearchParams({
      from,
      to,
      bookingPageId: pageId,
      serviceId,
    });

    if (isProfessionalView && professionalId) {
      params.set("professionalId", professionalId);
    } else if (salonAdmin) {
      if (proFilter === ANYONE) {
        params.set("anyone", "1");
      } else {
        params.set("professionalId", proFilter);
      }
    } else if (professionalId) {
      params.set("professionalId", professionalId);
    }

    fetch(`/api/agenda/calendar?${params}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setCalError(data.error || "Não foi possível carregar o calendário");
          setBookings([]);
          setSlots([]);
          setSetupHint(null);
          return;
        }
        setBookings(data.bookings || []);
        setSlots(data.availableSlots || []);
        setGoogleEvents(data.googleEvents || []);
        setGoogleConnected(Boolean(data.googleConnected));
        setSetupHint((data.setupHint as SetupHint) || null);
      })
      .catch(() => {
        setCalError("Falha de rede ao carregar o calendário");
      })
      .finally(() => setLoadingCal(false));
  }, [
    from,
    to,
    pageId,
    serviceId,
    professionalId,
    isProfessionalView,
    salonAdmin,
    proFilter,
    prosForService.length,
    allPros.length,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const showPageFilter = pages.length > 1;
  const selectedService = services.find((s) => s.id === serviceId);
  const today = new Date();

  const modalProId =
    isProfessionalView && professionalId
      ? professionalId
      : salonAdmin
        ? manualSlot?.professionalId ||
          (proFilter !== ANYONE ? proFilter : null)
        : professionalId;

  const modalAnyone =
    salonAdmin && proFilter === ANYONE && !manualSlot?.professionalId;

  return (
    <div className="agenda-week space-y-3">
      <ManualBookingModal
        open={Boolean(manualSlot)}
        slot={manualSlot}
        serviceTitle={selectedService?.title || "Serviço"}
        bookingPageId={pageId}
        serviceId={serviceId}
        businessMode={businessMode}
        professionalId={modalProId}
        isProfessionalView={isProfessionalView}
        professionals={prosForService.map((p) => ({
          id: p.id,
          displayName: p.displayName,
        }))}
        anyoneMode={Boolean(modalAnyone)}
        onClose={() => setManualSlot(null)}
        onCreated={load}
      />

      {calError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
          {calError}
        </p>
      )}

      {setupHint === "NO_PROS" && (
        <div className="agenda-hint">
          <span>Nenhum profissional neste serviço.</span>
          <a href="/app/profissionais">Vincular →</a>
        </div>
      )}
      {setupHint === "NO_HOURS" && (
        <div className="agenda-hint">
          <span>Profissional sem horários definidos.</span>
          <a href="/app/profissionais">Definir →</a>
        </div>
      )}

      {selectedBooking && (
        <div className="agenda-booking-peek">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold tracking-tight">
              {selectedBooking.customerName}
            </p>
            <p className="truncate text-xs text-muted">
              {format(parseISO(selectedBooking.startAt), "EEE d MMM · HH:mm", {
                locale: ptBR,
              })}
              {" · "}
              {selectedBooking.serviceTitle}
              {selectedBooking.professionalName
                ? ` · ${selectedBooking.professionalName}`
                : ""}
            </p>
          </div>
          <a href="/app/agenda/listagem" className="agenda-peek-link">
            Detalhes
          </a>
          <button
            type="button"
            className="agenda-peek-close"
            onClick={() => setSelectedBooking(null)}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
      )}

      <div className="agenda-toolbar">
        <div className="agenda-toolbar-left">
          <div className="agenda-nav">
            <button
              type="button"
              onClick={() => setWeekStart(subWeeks(weekStart, 1))}
              className="agenda-nav-btn"
              aria-label="Semana anterior"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() =>
                setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))
              }
              className="agenda-nav-today"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => setWeekStart(addWeeks(weekStart, 1))}
              className="agenda-nav-btn"
              aria-label="Próxima semana"
            >
              ›
            </button>
          </div>
          <p className="agenda-range capitalize">
            {format(weekStart, "d MMM", { locale: ptBR })} –{" "}
            {format(weekEnd, "d MMM yyyy", { locale: ptBR })}
          </p>
          {loadingCal && <span className="agenda-loading" aria-hidden />}
        </div>

        <div className="agenda-toolbar-right">
          {showPageFilter && (
            <select
              className="agenda-select"
              aria-label="Página"
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
            >
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          )}
          {services.length > 0 && (
            <select
              className="agenda-select"
              aria-label="Serviço"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          )}
          {salonAdmin && (
            <select
              className="agenda-select"
              aria-label="Profissional"
              value={proFilter}
              onChange={(e) => setProFilter(e.target.value)}
              disabled={prosForService.length === 0}
            >
              <option value={ANYONE}>Qualquer</option>
              {prosForService.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            className={`agenda-chip ${showSlots ? "is-on is-slots" : ""}`}
            aria-pressed={showSlots}
            onClick={() => setShowSlots((v) => !v)}
          >
            Livres
          </button>
          <button
            type="button"
            className={`agenda-chip ${showGoogle ? "is-on is-google" : ""}`}
            aria-pressed={showGoogle}
            onClick={() => setShowGoogle((v) => !v)}
          >
            Google
          </button>
          {!googleConnected && !isProfessionalView && !salonAdmin && (
            <a href="/app/integracoes" className="agenda-connect">
              Conectar
            </a>
          )}
        </div>
      </div>

      <div
        className={`agenda-grid-wrap surface ${loadingCal ? "is-loading" : ""}`}
      >
        <div className="agenda-grid-head">
          <div className="agenda-time-gutter" />
          {days.map((d) => {
            const isToday = isSameDay(d, today);
            return (
              <div
                key={d.toISOString()}
                className={`agenda-day-head ${isToday ? "is-today" : ""}`}
              >
                <span className="agenda-day-name">
                  {format(d, "EEE", { locale: ptBR })}
                </span>
                <span className="agenda-day-num">{format(d, "d")}</span>
              </div>
            );
          })}
        </div>

        <div className="agenda-grid-body">
          <div className="agenda-time-col">
            {HOURS.map((h) => (
              <div key={h} className="agenda-hour-label">
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {days.map((day) => {
            const isToday = isSameDay(day, today);
            return (
              <div
                key={day.toISOString()}
                className={`agenda-day-col ${isToday ? "is-today" : ""}`}
              >
                {HOURS.map((h) => (
                  <div key={h} className="agenda-hour-cell" />
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
                      const style = {
                        top: `${top}px`,
                        height: `${heightPx(ev.startAt, ev.endAt)}px`,
                      };
                      const className = "agenda-block agenda-block-google";
                      const label = (
                        <span className="truncate font-medium">
                          {ev.summary}
                        </span>
                      );
                      if (ev.htmlLink) {
                        return (
                          <a
                            key={ev.id}
                            href={ev.htmlLink}
                            target="_blank"
                            rel="noreferrer"
                            className={className}
                            style={style}
                            title={ev.summary}
                          >
                            {label}
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
                          {label}
                        </div>
                      );
                    })}

                {showSlots &&
                  slots
                    .filter((s) => s.date === format(day, "yyyy-MM-dd"))
                    .map((s, i) => {
                      const { top } = topPx(s.startAt, weekStart);
                      const proName =
                        salonAdmin && s.professionalId
                          ? prosForService.find(
                              (p) => p.id === s.professionalId,
                            )?.displayName
                          : null;
                      return (
                        <button
                          type="button"
                          key={`slot-${s.startAt}-${i}`}
                          className="agenda-block agenda-block-slot"
                          style={{
                            top: `${top}px`,
                            height: `${heightPx(s.startAt, s.endAt)}px`,
                          }}
                          title={
                            proName
                              ? `Agendar · ${proName}`
                              : "Agendar"
                          }
                          onClick={() => {
                            setSelectedBooking(null);
                            setManualSlot(s);
                          }}
                        >
                          <span>{s.label}</span>
                          {proName && proFilter === ANYONE ? (
                            <span className="agenda-block-sub">{proName}</span>
                          ) : null}
                        </button>
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
                      <button
                        type="button"
                        key={b.id}
                        className={`agenda-block ${
                          confirmed
                            ? "agenda-block-confirmed"
                            : "agenda-block-pending"
                        }`}
                        style={{
                          top: `${top}px`,
                          height: `${heightPx(b.startAt, b.endAt)}px`,
                        }}
                        title={`${b.serviceTitle} · ${b.customerName}`}
                        onClick={() => setSelectedBooking(b)}
                      >
                        <span className="truncate">{b.customerName}</span>
                      </button>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
