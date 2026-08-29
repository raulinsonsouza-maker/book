"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatBRL } from "@/lib/utils";

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
  canManage: boolean;
};

export default function ManageBookingPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [booking, setBooking] = useState<BookingView | null>(null);
  const [days, setDays] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<Array<{ startAt: string; endAt: string }>>([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
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
    if (!token || !selectedDate) return;
    fetch(`/api/public/manage/${token}?date=${selectedDate}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots || []));
  }, [token, selectedDate]);

  async function cancel() {
    if (!token || !confirm("Cancelar este agendamento?")) return;
    setBusy(true);
    const res = await fetch(`/api/public/manage/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Não foi possível cancelar");
      return;
    }
    setBooking(data.booking);
    setMsg("Agendamento cancelado");
    setMode("view");
  }

  async function reschedule(startAt: string) {
    if (!token) return;
    setBusy(true);
    const res = await fetch(`/api/public/manage/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reschedule", startAt }),
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
    setSlots([]);
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-4">
        <p className="text-sm text-muted">Carregando…</p>
      </main>
    );
  }

  if (!booking) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-4">
        <p className="text-sm text-muted">{error || "Não encontrado"}</p>
      </main>
    );
  }

  const start = parseISO(booking.startAt);
  const end = parseISO(booking.endAt);

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-10">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">Book Symbius</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{booking.pageTitle}</h1>
      <p className="mt-1 text-sm text-muted">{booking.orgName}</p>

      {msg && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {msg}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="mt-6 space-y-3 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium">{booking.serviceTitle}</p>
        <p className="text-sm text-muted">
          {format(start, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
        <p className="text-sm">
          {format(start, "HH:mm")}–{format(end, "HH:mm")} · {booking.timezone}
        </p>
        <p className="text-sm text-muted">{formatBRL(booking.priceCents)}</p>
        <p className="text-xs uppercase tracking-wide text-muted">Status: {booking.status}</p>
        {booking.meetLink && (
          <a
            href={booking.meetLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex text-sm font-medium underline-offset-2 hover:underline"
          >
            Entrar no Google Meet
          </a>
        )}
      </div>

      {booking.canManage && mode === "view" && (
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => setMode("reschedule")}
            className="btn-primary"
          >
            Remarcar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void cancel()}
            className="btn-secondary text-danger"
          >
            Cancelar agendamento
          </button>
        </div>
      )}

      {booking.canManage && mode === "reschedule" && (
        <div className="mt-6 space-y-4">
          <button type="button" className="text-sm text-muted" onClick={() => setMode("view")}>
            ← Voltar
          </button>
          <div className="flex flex-wrap gap-2">
            {days.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDate(d)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  selectedDate === d ? "border-foreground bg-foreground text-white" : "border-black/10"
                }`}
              >
                {format(parseISO(`${d}T12:00:00`), "dd/MM")}
              </button>
            ))}
          </div>
          {selectedDate && (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((s) => (
                <button
                  key={s.startAt}
                  type="button"
                  disabled={busy}
                  onClick={() => void reschedule(s.startAt)}
                  className="rounded-lg border border-black/10 px-2 py-2 text-sm hover:bg-black/5"
                >
                  {format(parseISO(s.startAt), "HH:mm")}
                </button>
              ))}
              {slots.length === 0 && (
                <p className="col-span-3 text-sm text-muted">Nenhum horário neste dia</p>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
