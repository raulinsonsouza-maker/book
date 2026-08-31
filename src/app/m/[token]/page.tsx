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
  accentColor: string;
  logoUrl: string | null;
  meetLink: string | null;
  priceCents: number;
  canReschedule: boolean;
  paymentStatus: string | null;
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

  const accent = booking?.accentColor || "#0a0a0a";
  const logoUrl = booking?.logoUrl;

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
      <main className="booking-shell flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-muted">
          {error || "Link inválido ou agendamento não encontrado"}
        </p>
        <a href="/" className="text-sm font-medium underline-offset-2 hover:underline">
          Ir para o início
        </a>
      </main>
    );
  }

  const start = parseISO(booking.startAt);
  const end = parseISO(booking.endAt);
  const statusHelp =
    booking.status === "PENDING_PAYMENT"
      ? "Este agendamento ainda aguarda pagamento. Se você já pagou, aguarde a confirmação ou fale com a empresa."
      : booking.status === "EXPIRED"
        ? "O prazo para pagamento deste horário expirou. Faça um novo agendamento pelo link da empresa."
        : booking.status === "CANCELLED"
          ? "Este agendamento foi cancelado."
          : null;

  return (
    <div
      className="booking-shell min-h-dvh"
      style={{ "--accent": accent } as React.CSSProperties}
    >
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="h-9 max-w-[7.5rem] object-contain"
            />
          ) : (
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
              style={{ background: accent }}
            >
              {booking.orgName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold tracking-tight">
              {booking.orgName}
            </p>
            <p className="truncate text-xs text-muted">
              {mode === "reschedule" ? "Remarcar horário" : "Seu agendamento"}
            </p>
          </div>
        </div>
      </header>

      <main
        className={`mx-auto max-w-lg px-4 py-6 ${
          mode === "reschedule" && selectedSlot ? "pb-36" : "pb-10"
        }`}
      >
        {msg && (
          <p className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
            {msg}
          </p>
        )}
        {error && (
          <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}
        {statusHelp && (
          <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-950">
            {statusHelp}
          </p>
        )}

        {mode === "view" && (
          <div className="space-y-5 animate-in">
            <div>
              <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight">
                Seu agendamento
              </h1>
              <p className="mt-2 text-sm text-muted">{booking.pageTitle}</p>
            </div>

            <div className="booking-card space-y-2 p-5">
              <p className="text-base font-semibold tracking-tight">
                {booking.serviceTitle}
              </p>
              <p className="text-sm capitalize text-muted">
                {format(start, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              <p className="text-sm font-medium">
                {format(start, "HH:mm")}–{format(end, "HH:mm")}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="tag">{booking.durationMinutes} min</span>
                <span
                  className="rounded-md px-2 py-0.5 text-xs font-bold text-white"
                  style={{ background: accent }}
                >
                  {formatBRL(booking.priceCents)}
                </span>
              </div>
              {booking.paymentStatus && (
                <p className="text-xs text-muted">
                  Pagamento:{" "}
                  {booking.paymentStatus === "PAID"
                    ? "pago"
                    : booking.paymentStatus === "PENDING"
                      ? "pendente"
                      : booking.paymentStatus.toLowerCase()}
                </p>
              )}
              {booking.meetLink && (
                <a
                  href={booking.meetLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex pt-1 text-sm font-medium underline-offset-2 hover:underline"
                  style={{ color: accent }}
                >
                  Entrar no Google Meet
                </a>
              )}
            </div>

            {booking.canReschedule && (
              <div className="space-y-3">
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
                  className="btn-primary w-full !rounded-2xl !py-3.5 text-base"
                >
                  Remarcar horário
                </button>
                <p className="text-center text-xs leading-relaxed text-muted">
                  Precisa cancelar? Fale com {booking.orgName}.
                </p>
              </div>
            )}

            {!booking.canReschedule && booking.status === "CANCELLED" && (
              <p className="text-sm text-muted">Este agendamento foi cancelado.</p>
            )}
          </div>
        )}

        {booking.canReschedule && mode === "reschedule" && (
          <div className="space-y-5 animate-in">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-foreground"
              onClick={() => {
                setMode("view");
                setSelectedDate("");
                setSelectedSlot(null);
                setSlots([]);
                setError("");
              }}
            >
              ← Voltar
            </button>

            <div>
              <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight">
                Escolha o novo dia
              </h1>
              <p className="mt-2 text-sm text-muted">
                {booking.serviceTitle}
              </p>
            </div>

            <div className="booking-card px-4 py-3.5">
              <p className="text-sm font-semibold tracking-tight">
                {booking.serviceTitle}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <span className="tag">{booking.durationMinutes} min</span>
                <span
                  className="rounded-md px-2 py-0.5 text-xs font-bold text-white"
                  style={{ background: accent }}
                >
                  {formatBRL(booking.priceCents)}
                </span>
              </div>
            </div>

            <div className="booking-card overflow-hidden">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold tracking-tight">
                  Próximos dias
                </p>
              </div>
              <div className="-mx-0 flex gap-2 overflow-x-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
              <div className="booking-card p-4">
                <p className="text-sm font-semibold capitalize tracking-tight">
                  {format(parseISO(selectedDate), "EEEE, d 'de' MMMM", {
                    locale: ptBR,
                  })}
                </p>
                {slotsLoading ? (
                  <div className="mt-5 flex items-center justify-center gap-2 py-8 text-sm text-muted">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-foreground" />
                    Carregando horários…
                  </div>
                ) : slots.length === 0 ? (
                  <p className="mt-4 rounded-xl bg-muted-bg px-3 py-5 text-center text-sm text-muted">
                    Sem horários neste dia. Escolha outra data.
                  </p>
                ) : (
                  <div className="mt-4 space-y-5">
                    {morning.length > 0 && (
                      <div>
                        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                          Manhã
                        </p>
                        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                          {morning.map((s) => (
                            <button
                              key={s.startAt}
                              type="button"
                              onClick={() => setSelectedSlot(s)}
                              className={`booking-slot ${
                                selectedSlot?.startAt === s.startAt
                                  ? "booking-slot-selected"
                                  : "hover:border-foreground/40"
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
                        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                          Tarde
                        </p>
                        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                          {afternoon.map((s) => (
                            <button
                              key={s.startAt}
                              type="button"
                              onClick={() => setSelectedSlot(s)}
                              className={`booking-slot ${
                                selectedSlot?.startAt === s.startAt
                                  ? "booking-slot-selected"
                                  : "hover:border-foreground/40"
                              }`}
                            >
                              {format(parseISO(s.startAt), "HH:mm")}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {mode === "reschedule" && selectedSlot && (
        <div className="booking-dock fixed inset-x-0 bottom-0 z-40">
          <div className="mx-auto flex max-w-lg items-center gap-3 px-4 pt-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                Novo horário
              </p>
              <p className="truncate text-sm font-semibold capitalize">
                {format(parseISO(selectedSlot.startAt), "EEE d MMM · HH:mm", {
                  locale: ptBR,
                })}
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void confirmReschedule()}
              className="btn-primary shrink-0 !rounded-2xl !px-5 !py-3"
            >
              {busy ? "Remarcando…" : "Confirmar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ManageBookingPage() {
  return (
    <ConfirmProvider>
      <ManageBookingInner />
    </ConfirmProvider>
  );
}
