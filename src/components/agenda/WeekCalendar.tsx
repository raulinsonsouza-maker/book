"use client";

import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ManualBookingModal } from "@/components/agenda/ManualBookingModal";
import type { CustomerPick } from "@/components/clients/CustomerPicker";
import {
  AgendaBookingModal,
  type AgendaBookingDetails,
} from "@/components/agenda/AgendaBookingModal";

type BookingItem = AgendaBookingDetails;

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
type AgendaView = "day" | "week" | "month";

const HOUR_START = 6;
const HOUR_END = 22;
const HOURS = Array.from(
  { length: HOUR_END - HOUR_START + 1 },
  (_, i) => HOUR_START + i,
);
const WEEK_STARTS_ON = 0 as const;
const VIEW_OPTIONS: { id: AgendaView; label: string }[] = [
  { id: "day", label: "Dia" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mês" },
];

/** Sentinel no select: qualquer profissional disponível para o serviço. */
const ANYONE = "__anyone__";
/** Sentinel: todas as páginas / todos os serviços. */
/** Precisa bater com `/api/agenda/calendar` (`bookingPageId` / `serviceId` === "all"). */
const ALL = "all";

function topPx(iso: string) {
  const d = parseISO(iso);
  const hours = d.getHours() + d.getMinutes() / 60;
  const top = (hours - HOUR_START) * 48;
  return Math.max(0, top);
}

function heightPx(startAt: string, endAt: string) {
  const ms = parseISO(endAt).getTime() - parseISO(startAt).getTime();
  return Math.max(24, (ms / 3600000) * 48);
}

function bookingTone(status: string) {
  if (status === "CONFIRMED" || status === "ARRIVED") return "agenda-block-confirmed";
  if (status === "COMPLETED") return "agenda-block-completed";
  if (status === "NO_SHOW") return "agenda-block-noshow";
  return "agenda-block-pending";
}

function monthChipTone(status: string) {
  if (status === "CONFIRMED" || status === "ARRIVED") return "is-confirmed";
  if (status === "COMPLETED") return "is-completed";
  if (status === "NO_SHOW") return "is-noshow";
  return "is-pending";
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
  const searchParams = useSearchParams();
  const prefillCustomerId = searchParams.get("customerId");

  const [view, setView] = useState<AgendaView>("week");
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [pageId, setPageId] = useState(initialPageId);
  const [serviceId, setServiceId] = useState(initialServiceId);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [allPros, setAllPros] = useState<ProOption[]>([]);
  /** ANYONE | id do pro — só usado em SALON admin */
  const [proFilter, setProFilter] = useState<string>(ANYONE);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [googleEvents, setGoogleEvents] = useState<GoogleEventItem[]>([]);
  const [loadingCal, setLoadingCal] = useState(false);
  const [calError, setCalError] = useState("");
  const [setupHint, setSetupHint] = useState<SetupHint>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);
  const [manualSlot, setManualSlot] = useState<SlotItem | null>(null);
  const [prefillCustomer, setPrefillCustomer] = useState<CustomerPick | null>(
    null,
  );

  useEffect(() => {
    if (!prefillCustomerId) {
      setPrefillCustomer(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/clients/${prefillCustomerId}`)
      .then(async (r) => {
        if (!r.ok) return;
        const data = await r.json();
        const c = data.customer;
        if (!c || cancelled) return;
        setPrefillCustomer({
          id: c.id,
          name: c.name,
          phoneE164: c.phoneE164,
          email: c.email ?? null,
          cpf: c.cpf ?? null,
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [prefillCustomerId]);

  const range = useMemo(() => {
    if (view === "day") {
      return { start: cursor, end: cursor };
    }
    if (view === "week") {
      const start = startOfWeek(cursor, { weekStartsOn: WEEK_STARTS_ON });
      return { start, end: addDays(start, 6) };
    }
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);
    return {
      start: startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON }),
      end: endOfWeek(monthEnd, { weekStartsOn: WEEK_STARTS_ON }),
    };
  }, [cursor, view]);

  const from = format(range.start, "yyyy-MM-dd");
  const to = format(range.end, "yyyy-MM-dd");

  const days = useMemo(
    () => eachDayOfInterval({ start: range.start, end: range.end }),
    [range.start, range.end],
  );

  const gridDays = view === "day" ? [cursor] : view === "week" ? days : days;

  const concretePage = pageId !== ALL;
  const concreteService = serviceId !== ALL;

  const prosForService = useMemo(
    () =>
      concreteService
        ? allPros.filter((p) => p.serviceIds.includes(serviceId))
        : allPros,
    [allPros, serviceId, concreteService],
  );

  useEffect(() => {
    if (!concretePage) {
      fetch("/api/services")
        .then((r) => r.json())
        .then((list) => {
          const next = (Array.isArray(list) ? list : []).filter(
            (s: ServiceOption & { isActive?: boolean }) => s.isActive !== false,
          );
          setServices(next);
          if (
            serviceId !== ALL &&
            !next.find((s: ServiceOption) => s.id === serviceId)
          ) {
            setServiceId(ALL);
          }
        })
        .catch(() => undefined);
      return;
    }

    fetch(`/api/pages/${pageId}`)
      .then((r) => r.json())
      .then((p) => {
        const list = (p.services || []).filter(
          (s: ServiceOption & { isActive?: boolean }) => s.isActive !== false,
        );
        setServices(list);
        if (
          serviceId !== ALL &&
          !list.find((s: ServiceOption) => s.id === serviceId)
        ) {
          setServiceId(list[0]?.id || ALL);
        }
      })
      .catch(() => undefined);
  }, [pageId, concretePage, serviceId]);

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
    const wantSlots = view !== "month" && concretePage && concreteService;
    if (
      wantSlots &&
      salonAdmin &&
      prosForService.length === 0 &&
      allPros.length > 0
    ) {
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
    if (!wantSlots) params.set("includeSlots", "0");

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
        const nextBookings: BookingItem[] = data.bookings || [];
        setBookings(nextBookings);
        setSlots(wantSlots ? data.availableSlots || [] : []);
        setGoogleEvents(data.googleEvents || []);
        setSetupHint(wantSlots ? (data.setupHint as SetupHint) || null : null);
        setSelectedBooking((prev) => {
          if (!prev) return prev;
          return nextBookings.find((b) => b.id === prev.id) ?? prev;
        });
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
    view,
    concretePage,
    concreteService,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  const showPageFilter = pages.length > 1;
  const selectedService = services.find((s) => s.id === serviceId);
  const today = new Date();

  const rangeLabel =
    view === "day"
      ? format(cursor, "EEEE, d 'de' MMMM yyyy", { locale: ptBR })
      : view === "week"
        ? `${format(range.start, "d MMM", { locale: ptBR })} – ${format(range.end, "d MMM yyyy", { locale: ptBR })}`
        : format(cursor, "MMMM yyyy", { locale: ptBR });

  function goPrev() {
    if (view === "day") setCursor((d) => addDays(d, -1));
    else if (view === "week") setCursor((d) => subWeeks(d, 1));
    else setCursor((d) => subMonths(d, 1));
  }

  function goNext() {
    if (view === "day") setCursor((d) => addDays(d, 1));
    else if (view === "week") setCursor((d) => addWeeks(d, 1));
    else setCursor((d) => addMonths(d, 1));
  }

  function goToday() {
    setCursor(startOfDay(new Date()));
  }

  function openDay(day: Date) {
    setCursor(startOfDay(day));
    setView("day");
  }

  const modalProId =
    isProfessionalView && professionalId
      ? professionalId
      : salonAdmin
        ? manualSlot?.professionalId ||
          (proFilter !== ANYONE ? proFilter : null)
        : professionalId;

  const modalAnyone =
    salonAdmin && proFilter === ANYONE && !manualSlot?.professionalId;

  function renderTimeGrid(columns: Date[]) {
    const colCount = columns.length;
    return (
      <div
        className={`agenda-grid-wrap surface ${loadingCal ? "is-loading" : ""} ${
          colCount === 1 ? "is-day" : ""
        }`}
      >
        <div
          className="agenda-grid-head"
          style={{ gridTemplateColumns: `48px repeat(${colCount}, 1fr)` }}
        >
          <div className="agenda-time-gutter" />
          {columns.map((d) => {
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

        <div
          className="agenda-grid-body"
          style={{ gridTemplateColumns: `48px repeat(${colCount}, 1fr)` }}
        >
          <div className="agenda-time-col">
            {HOURS.map((h) => (
              <div key={h} className="agenda-hour-label">
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {columns.map((day) => {
            const isToday = isSameDay(day, today);
            const dayKey = format(day, "yyyy-MM-dd");
            return (
              <div
                key={day.toISOString()}
                className={`agenda-day-col ${isToday ? "is-today" : ""}`}
              >
                {HOURS.map((h) => (
                  <div key={h} className="agenda-hour-cell" />
                ))}

                {googleEvents
                    .filter(
                      (ev) =>
                        format(parseISO(ev.startAt), "yyyy-MM-dd") === dayKey,
                    )
                    .map((ev) => {
                      const style = {
                        top: `${topPx(ev.startAt)}px`,
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

                {slots
                    .filter((s) => s.date === dayKey)
                    .map((s, i) => {
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
                            top: `${topPx(s.startAt)}px`,
                            height: `${heightPx(s.startAt, s.endAt)}px`,
                          }}
                          title={
                            proName ? `Agendar · ${proName}` : "Agendar"
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
                      format(parseISO(b.startAt), "yyyy-MM-dd") === dayKey,
                  )
                  .map((b) => (
                    <button
                      type="button"
                      key={b.id}
                      className={`agenda-block ${bookingTone(b.status)}`}
                      style={{
                        top: `${topPx(b.startAt)}px`,
                        height: `${heightPx(b.startAt, b.endAt)}px`,
                      }}
                      title={`${b.serviceTitle} · ${b.customerName}${
                        b.professionalName ? ` · ${b.professionalName}` : ""
                      }`}
                      onClick={() => setSelectedBooking(b)}
                    >
                      <span className="truncate font-medium">
                        {b.customerName}
                      </span>
                      <span className="agenda-block-sub truncate">
                        {b.serviceTitle}
                      </span>
                    </button>
                  ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderMonthGrid() {
    const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
      format(addDays(startOfWeek(new Date(), { weekStartsOn: WEEK_STARTS_ON }), i), "EEE", {
        locale: ptBR,
      }),
    );

    return (
      <div
        className={`agenda-month-wrap surface ${loadingCal ? "is-loading" : ""}`}
      >
        <div className="agenda-month-head">
          {weekdayLabels.map((label) => (
            <div key={label} className="agenda-month-weekday">
              {label}
            </div>
          ))}
        </div>
        <div className="agenda-month-body">
          {gridDays.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const inMonth = isSameMonth(day, cursor);
            const isToday = isSameDay(day, today);
            const dayBookings = bookings.filter(
              (b) => format(parseISO(b.startAt), "yyyy-MM-dd") === dayKey,
            );
            const dayGoogle = googleEvents.filter(
              (ev) => format(parseISO(ev.startAt), "yyyy-MM-dd") === dayKey,
            );
            const chips = [
              ...dayBookings.map((b) => ({
                key: b.id,
                label: `${format(parseISO(b.startAt), "HH:mm")} ${b.customerName}`,
                tone: monthChipTone(b.status),
                onClick: () => setSelectedBooking(b),
              })),
              ...dayGoogle.map((ev) => ({
                key: `g-${ev.id}`,
                label: `${format(parseISO(ev.startAt), "HH:mm")} ${ev.summary}`,
                tone: "is-google",
                onClick: () => {
                  if (ev.htmlLink) window.open(ev.htmlLink, "_blank", "noreferrer");
                },
              })),
            ].slice(0, 4);
            const extra =
              dayBookings.length + dayGoogle.length - chips.length;

            return (
              <div
                key={day.toISOString()}
                className={`agenda-month-cell ${inMonth ? "" : "is-out"} ${
                  isToday ? "is-today" : ""
                }`}
              >
                <button
                  type="button"
                  className="agenda-month-day-btn"
                  onClick={() => openDay(day)}
                  aria-label={`Abrir ${format(day, "d MMMM", { locale: ptBR })}`}
                >
                  <span className="agenda-month-day-num">{format(day, "d")}</span>
                </button>
                <div className="agenda-month-events">
                  {chips.map((chip) => (
                    <button
                      type="button"
                      key={chip.key}
                      className={`agenda-month-chip ${chip.tone}`}
                      title={chip.label}
                      onClick={chip.onClick}
                    >
                      {chip.label}
                    </button>
                  ))}
                  {extra > 0 && (
                    <button
                      type="button"
                      className="agenda-month-more"
                      onClick={() => openDay(day)}
                    >
                      +{extra}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="agenda-week space-y-3">
      {prefillCustomer ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-white px-4 py-3 text-sm shadow-sm">
          <p>
            Agendando para <strong>{prefillCustomer.name}</strong> — escolha um
            horário na grade.
          </p>
          <a href="/app/agenda/calendario" className="text-xs font-medium text-muted underline-offset-2 hover:underline">
            Limpar
          </a>
        </div>
      ) : null}

      <ManualBookingModal
        open={Boolean(manualSlot) && concretePage && concreteService}
        slot={manualSlot}
        serviceTitle={selectedService?.title || "Serviço"}
        bookingPageId={concretePage ? pageId : ""}
        serviceId={concreteService ? serviceId : ""}
        businessMode={businessMode}
        professionalId={modalProId}
        isProfessionalView={isProfessionalView}
        professionals={prosForService.map((p) => ({
          id: p.id,
          displayName: p.displayName,
        }))}
        anyoneMode={Boolean(modalAnyone)}
        initialCustomer={prefillCustomer}
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
        <AgendaBookingModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onChanged={load}
        />
      )}

      <div className="agenda-toolbar">
        <div className="agenda-toolbar-left">
          <div className="agenda-nav">
            <button
              type="button"
              onClick={goPrev}
              className="agenda-nav-btn"
              aria-label={
                view === "month"
                  ? "Mês anterior"
                  : view === "week"
                    ? "Semana anterior"
                    : "Dia anterior"
              }
            >
              ‹
            </button>
            {view !== "month" && (
              <button
                type="button"
                onClick={goToday}
                className="agenda-nav-today"
              >
                Hoje
              </button>
            )}
            <button
              type="button"
              onClick={goNext}
              className="agenda-nav-btn"
              aria-label={
                view === "month"
                  ? "Próximo mês"
                  : view === "week"
                    ? "Próxima semana"
                    : "Próximo dia"
              }
            >
              ›
            </button>
          </div>
          <div className="agenda-view-switch" role="group" aria-label="Visualização">
            {VIEW_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`agenda-view-btn ${view === opt.id ? "is-active" : ""}`}
                aria-pressed={view === opt.id}
                onClick={() => setView(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="agenda-range capitalize">{rangeLabel}</p>
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
              <option value={ALL}>Todos</option>
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          )}
          {(services.length > 0 || serviceId === ALL) && (
            <select
              className="agenda-select"
              aria-label="Serviço"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
            >
              <option value={ALL}>Todos</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          )}
          {salonAdmin && concreteService && (
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
        </div>
      </div>

      {view === "month"
        ? renderMonthGrid()
        : renderTimeGrid(view === "day" ? [cursor] : days.slice(0, 7))}
    </div>
  );
}
