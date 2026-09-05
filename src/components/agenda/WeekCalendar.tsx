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
    <div className="space-y-3">
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
      {loadingCal && (
        <p className="text-xs text-muted">Atualizando calendário…</p>
      )}

      {setupHint === "NO_PROS" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">Nenhum profissional atende este serviço</p>
          <p className="mt-1 text-xs text-amber-900/80">
            Vincule o serviço a pelo menos um profissional para ver horários
            livres.
          </p>
          <a
            href="/app/profissionais"
            className="mt-2 inline-flex text-xs font-semibold underline-offset-2 hover:underline"
          >
            Ir para Profissionais →
          </a>
        </div>
      )}
      {setupHint === "NO_HOURS" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">Agenda do profissional sem horários</p>
          <p className="mt-1 text-xs text-amber-900/80">
            Defina os dias e horários de atendimento do profissional para liberar
            slots.
          </p>
          <a
            href="/app/profissionais"
            className="mt-2 inline-flex text-xs font-semibold underline-offset-2 hover:underline"
          >
            Definir horários →
          </a>
        </div>
      )}

      {selectedBooking && (
        <div className="rounded-xl border border-border bg-white p-4 text-sm shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold tracking-tight">
                {selectedBooking.customerName}
              </p>
              <p className="text-muted">{selectedBooking.serviceTitle}</p>
              {selectedBooking.professionalName && (
                <p className="text-xs text-muted">
                  com {selectedBooking.professionalName}
                </p>
              )}
              <p className="mt-1 text-xs text-muted">
                {format(parseISO(selectedBooking.startAt), "EEE d MMM · HH:mm", {
                  locale: ptBR,
                })}{" "}
                · {selectedBooking.status}
              </p>
            </div>
            <button
              type="button"
              className="text-xs text-muted hover:text-foreground"
              onClick={() => setSelectedBooking(null)}
            >
              Fechar
            </button>
          </div>
          <a
            href="/app/agenda/listagem"
            className="mt-3 inline-flex text-xs font-medium underline-offset-2 hover:underline"
          >
            Abrir em Agendamentos
          </a>
        </div>
      )}
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
            onClick={() =>
              setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))
            }
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
          {services.length > 0 && (
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
          {salonAdmin && (
            <label className="flex items-center gap-1.5 text-xs text-muted">
              Profissional
              <select
                className="input-field !w-auto !py-1.5 text-sm"
                value={proFilter}
                onChange={(e) => setProFilter(e.target.value)}
                disabled={prosForService.length === 0}
              >
                <option value={ANYONE}>Qualquer disponível</option>
                {prosForService.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName}
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
          {!googleConnected && !isProfessionalView && !salonAdmin && (
            <a
              href="/app/integracoes"
              className="text-xs font-medium text-blue-700 underline-offset-2 hover:underline"
            >
              Conectar Google
            </a>
          )}
        </div>
      </div>

      {googleConnected && (
        <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-relaxed text-blue-900">
          Compromissos do Google aparecem em azul neste calendário (deixe o filtro
          <strong> Google</strong> ligado). Eles não entram na Listagem — só
          reservas feitas pelo Book Symbius.
        </p>
      )}

      <p className="rounded-xl border border-border bg-white px-3 py-2 text-xs text-muted">
        {salonAdmin
          ? "Escolha o serviço e o profissional — a grade mostra só horários livres da agenda dele. Clique no amarelo para agendar."
          : "Clique em um horário livre (amarelo) para agendar manualmente um cliente."}
      </p>

      <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-white px-3 py-2.5 shadow-sm">
        <LegendChip swatch="bg-emerald-600" label="Confirmado" />
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
                    const proName =
                      salonAdmin && s.professionalId
                        ? prosForService.find((p) => p.id === s.professionalId)
                            ?.displayName
                        : null;
                    return (
                      <button
                        type="button"
                        key={`slot-${s.startAt}-${i}`}
                        className="absolute inset-x-0.5 z-[1] cursor-pointer rounded border border-amber-300/80 bg-amber-100/90 px-1 text-left text-[10px] font-medium text-amber-900 transition hover:border-amber-500 hover:bg-amber-200/90"
                        style={{
                          top: `${top}px`,
                          height: `${heightPx(s.startAt, s.endAt)}px`,
                        }}
                        title={
                          proName
                            ? `Agendar com ${proName}`
                            : "Agendar manualmente"
                        }
                        onClick={() => {
                          setSelectedBooking(null);
                          setManualSlot(s);
                        }}
                      >
                        {s.label}
                        {proName && proFilter === ANYONE ? (
                          <span className="block truncate text-[9px] font-normal opacity-80">
                            {proName}
                          </span>
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
                      className={`absolute inset-x-0.5 z-[3] overflow-hidden rounded px-1 py-0.5 text-left text-[10px] leading-tight ${
                        confirmed
                          ? "bg-emerald-600 font-medium text-white shadow-sm hover:bg-emerald-700"
                          : "border-2 border-dashed border-amber-500 bg-white font-medium text-amber-900 hover:bg-amber-50"
                      }`}
                      style={{
                        top: `${top}px`,
                        height: `${heightPx(b.startAt, b.endAt)}px`,
                      }}
                      title={b.customerName}
                      onClick={() => setSelectedBooking(b)}
                    >
                      {b.serviceTitle} — {b.customerName}
                    </button>
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
