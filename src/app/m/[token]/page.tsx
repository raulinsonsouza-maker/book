"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatBRL } from "@/lib/utils";
import { ConfirmProvider, useConfirm } from "@/components/ui/ConfirmDialog";

type BookingView = {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  timezone: string;
  customerName: string;
  serviceTitle: string;
  pageTitle: string;
  pageSlug: string;
  orgName: string;
  meetLink: string | null;
  priceCents: number;
  canReschedule: boolean;
  durationMinutes: number;
};

type Slot = { startAt: string; endAt: string; label?: string };

function groupSlots(slots: Slot[]) {
  const morning: Slot[] = [];
  const afternoon: Slot[] = [];
  for (const s of slots) {
    const h = Number(format(parseISO(s.startAt), "H"));
    if (h < 12) morning.push(s);
    else afternoon.push(s);
  }
  return { morning, afternoon };
}

function ManageBookingInner() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { confirm } = useConfirm();
  const [booking, setBooking] = useState<BookingView | null>(null);
  const [days, setDays] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [mode, setMode] = useState<"view" | "reschedule">("view");

  const load = useCallback(async (t: string) => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/public/manage/${t}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Agendamento não encontrado");
      return;
    }
    setBooking(data.booking);
    setDays(data.availableDays || []);
  }, []);

  useEffect(() => {
    if (token) void load(token);
  }, [token, load]);

  useEffect(() => {
    if (!token || !selectedDate || mode !== "reschedule") return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    fetch(`/api/public/manage/${token}?date=${selectedDate}`)
      .then((r) => r.json())
      .then((data) => {
        setSlots(data.slots || []);
        setSlotsLoading(false);
      })
      .catch(() => setSlotsLoading(false));
  }, [token, selectedDate, mode]);

  const upcomingDays = useMemo(() => days.slice(0, 21), [days]);
  const { morning, afternoon } = useMemo(() => groupSlots(slots), [slots]);

  async function confirmReschedule() {
    if (!token || !selectedSlot) return;
    const ok = await confirm({
      title: "Confirmar novo horário?",
      description: `Remarcar para ${format(
        parseISO(selectedSlot.startAt),
        "EEEE, d MMM · HH:mm",
        { locale: ptBR },
      )}`,
      confirmLabel: "Confirmar remarcação",
      cancelLabel: "Voltar",
    });
    if (!ok) return;

    setBusy(true);
    setError("");
    const res = await fetch(`/api/public/manage/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reschedule",
        startAt: selectedSlot.startAt,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Não foi possível remarcar");
      return;
    }
    setBooking(data.booking);
    setMsg("Horário remarcado com sucesso");
    setMode("view");
    setSelectedDate("");
    setSelectedSlot(null);
    setSlots([]);
    if (token) void load(token);
  }

  if (loading) {
    return (
      <main className="booking-shell flex min-h-dvh items-center justify-center px-4">
        <p className="text-sm text-muted">Carregando…</p>
      </main>
    );
  }

  if (!booking) {
    return (
      <main className="booking-shell flex min-h-dvh items-center justify-center px-4">
        <p className="text-sm text-muted">{error || "Não encontrado"}</p>
      </main>
    );
  }

  const start = parseISO(booking.startAt);
  const end = parseISO(booking.endAt);

  return (
    <main className="booking-shell mx-auto min-h-dvh max-w-lg px-4 py-8">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
        {booking.orgName}
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">
        {booking.pageTitle}
      </h1>

      {msg && (
        <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          {msg}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="booking-card mt-6 space-y-2 p-5">
        <p className="text-base font-semibold tracking-tight">
          {booking.serviceTitle}
        </p>
        <p className="text-sm capitalize text-muted">
          {format(start, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
        <p className="text-sm font-medium">
          {format(start, "HH:mm")}–{format(end, "HH:mm")}
        </p>
        <p className="text-sm text-muted">{formatBRL(booking.priceCents)}</p>
        {booking.meetLink && (
          <a
            href={booking.meetLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex pt-1 text-sm font-medium underline-offset-2 hover:underline"
          >
            Entrar no Google Meet
          </a>
        )}
      </div>

      {booking.canReschedule && mode === "view" && (
        <div className="mt-6 space-y-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setMode("reschedule");
              setMsg("");
              setError("");
              setSelectedDate(upcomingDays[0] || "");
              setSelectedSlot(null);
            }}
            className="btn-primary w-full"
          >
            Remarcar horário
          </button>
          <p className="text-center text-xs leading-relaxed text-muted">
            Precisa cancelar? Fale com {booking.orgName} — o pagamento já foi
            confirmado e o cancelamento é tratado pela empresa.
          </p>
        </div>
      )}

      {booking.canReschedule && mode === "reschedule" && (
        <div className="mt-6 space-y-5 animate-in">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-foreground"
            onClick={() => {
              setMode("view");
              setSelectedDate("");
              setSelectedSlot(null);
              setSlots([]);
            }}
          >
            ← Voltar
          </button>

          <div>
            <h2 className="text-[1.35rem] font-bold tracking-tight">
              Escolha o novo dia
            </h2>
            <p className="mt-1 text-sm text-muted">
              Mesmo fluxo do agendamento: dia, depois horário
            </p>
          </div>

          <div className="booking-card overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold">Dias disponíveis</p>
            </div>
            <div className="flex gap-2 overflow-x-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {upcomingDays.length === 0 ? (
                <p className="text-sm text-muted">Nenhum dia disponível.</p>
              ) : (
                upcomingDays.map((key) => {
                  const d = parseISO(key);
                  const selected = selectedDate === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDate(key)}
                      className={`booking-day ${
                        selected ? "booking-day-selected" : ""
                      }`}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                        {format(d, "EEE", { locale: ptBR })}
                      </span>
                      <span className="text-lg font-bold leading-none">
                        {format(d, "d")}
                      </span>
                      <span className="text-[10px] font-medium capitalize opacity-80">
                        {format(d, "MMM", { locale: ptBR })}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {selectedDate && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold tracking-tight">
                Horários em{" "}
                {format(parseISO(selectedDate), "d 'de' MMMM", {
                  locale: ptBR,
                })}
              </h3>
              {slotsLoading ? (
                <p className="text-sm text-muted">Carregando horários…</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-muted">
                  Nenhum horário livre neste dia. Escolha outro.
                </p>
              ) : (
                <>
                  {morning.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                        Manhã
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {morning.map((s) => (
                          <button
                            key={s.startAt}
                            type="button"
                            onClick={() => setSelectedSlot(s)}
                            className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition ${
                              selectedSlot?.startAt === s.startAt
                                ? "border-foreground bg-foreground text-white"
                                : "border-border bg-white hover:bg-muted-bg"
                            }`}
                          >
                            {format(parseISO(s.startAt), "HH:mm")}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {afternoon.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                        Tarde
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {afternoon.map((s) => (
                          <button
                            key={s.startAt}
                            type="button"
                            onClick={() => setSelectedSlot(s)}
                            className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition ${
                              selectedSlot?.startAt === s.startAt
                                ? "border-foreground bg-foreground text-white"
                                : "border-border bg-white hover:bg-muted-bg"
                            }`}
                          >
                            {format(parseISO(s.startAt), "HH:mm")}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {selectedSlot && (
            <div className="sticky bottom-4 space-y-2 rounded-2xl border border-border bg-white/95 p-4 shadow-lg backdrop-blur">
              <p className="text-sm text-muted">
                Novo horário:{" "}
                <span className="font-semibold text-foreground">
                  {format(parseISO(selectedSlot.startAt), "EEE d MMM · HH:mm", {
                    locale: ptBR,
                  })}
                </span>
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void confirmReschedule()}
                className="btn-primary w-full"
              >
                {busy ? "Remarcando…" : "Confirmar remarcação"}
              </button>
            </div>
          )}
        </div>
      )}

      {!booking.canReschedule && booking.status === "CANCELLED" && (
        <p className="mt-6 text-sm text-muted">Este agendamento foi cancelado.</p>
      )}
    </main>
  );
}

export default function ManageBookingPage() {
  return (
    <ConfirmProvider>
      <ManageBookingInner />
    </ConfirmProvider>
  );
}
