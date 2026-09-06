"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type Org = {
  id: string;
  name: string;
  slug: string;
  accentColor: string;
  logoUrl: string | null;
};

type Customer = { id: string; name: string; phoneE164: string };

type BookingRow = {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  serviceTitle: string;
  professionalName: string | null;
  pageSlug: string;
  manageToken: string | null;
  canCancel: boolean;
  canReschedule: boolean;
};

function MemberReservasInner() {
  const { slug } = useParams<{ slug: string }>();
  const search = useSearchParams();
  const highlightId = search.get("b");

  const [org, setOrg] = useState<Org | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [msg, setMsg] = useState("");
  const [debugCode, setDebugCode] = useState<string | undefined>();
  const [selected, setSelected] = useState<BookingRow | null>(null);
  const [busy, setBusy] = useState(false);

  const accent = org?.accentColor || "#0a0a0a";

  const loadSession = useCallback(async () => {
    const res = await fetch(`/api/public/${slug}/member/auth`);
    if (!res.ok) return;
    const d = await res.json();
    setOrg(d.org);
    setCustomer(d.customer);
  }, [slug]);

  const loadBookings = useCallback(async () => {
    const res = await fetch(`/api/public/${slug}/member/bookings`);
    if (!res.ok) {
      setBookings([]);
      return;
    }
    const d = await res.json();
    setBookings(d.bookings || []);
    if (highlightId) {
      const hit = (d.bookings || []).find((b: BookingRow) => b.id === highlightId);
      if (hit) setSelected(hit);
    }
  }, [slug, highlightId]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (customer) void loadBookings();
  }, [customer, loadBookings]);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const res = await fetch(`/api/public/${slug}/member/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "request_otp", phone }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(d.error || "Erro");
      return;
    }
    setDebugCode(d.debugCode);
    setStep("code");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const res = await fetch(`/api/public/${slug}/member/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify_otp",
        phone,
        code,
        name: name || undefined,
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(d.error || "Erro");
      return;
    }
    setCustomer(d.customer);
  }

  async function cancelBooking(b: BookingRow) {
    if (!confirm("Cancelar este agendamento?")) return;
    setBusy(true);
    const res = await fetch(`/api/public/${slug}/member/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: b.id, action: "cancel" }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json();
      setMsg(d.error || "Não foi possível cancelar");
      return;
    }
    setSelected(null);
    await loadBookings();
  }

  async function logout() {
    await fetch(`/api/public/${slug}/member/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setCustomer(null);
    setBookings([]);
    setStep("phone");
  }

  const primaryPage = bookings[0]?.pageSlug;

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-[#f5f5f5] px-4 py-8">
      <div className="mb-6 text-center">
        {org?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={org.logoUrl}
            alt=""
            className="mx-auto mb-3 h-14 w-auto object-contain"
          />
        ) : null}
        <h1 className="text-xl font-semibold">{org?.name || "Reservas"}</h1>
        <p className="text-sm text-muted">Minhas reservas</p>
      </div>

      {!customer ? (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Fazer login ou cadastrar-se</h2>
          {step === "phone" ? (
            <form onSubmit={(e) => void requestOtp(e)} className="space-y-3">
              <label className="block text-sm">
                Celular
                <input
                  className="input-field mt-1"
                  placeholder="+55"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </label>
              <button
                type="submit"
                className="btn-primary w-full"
                style={{ background: accent }}
                disabled={busy}
              >
                Receber código via WhatsApp
              </button>
            </form>
          ) : (
            <form onSubmit={(e) => void verifyOtp(e)} className="space-y-3">
              <label className="block text-sm">
                Nome (se for a primeira vez)
                <input
                  className="input-field mt-1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Código
                <input
                  className="input-field mt-1"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </label>
              {debugCode && (
                <p className="text-xs text-muted">Dev: {debugCode}</p>
              )}
              <button
                type="submit"
                className="btn-primary w-full"
                style={{ background: accent }}
                disabled={busy}
              >
                Entrar
              </button>
              <button
                type="button"
                className="w-full text-sm underline"
                onClick={() => setStep("phone")}
              >
                Voltar
              </button>
            </form>
          )}
          {msg && <p className="mt-3 text-sm text-danger">{msg}</p>}
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between text-sm">
            <span>Olá, {customer.name}</span>
            <button type="button" className="underline" onClick={() => void logout()}>
              Sair
            </button>
          </div>

          <div className="space-y-3">
            {bookings.length === 0 && (
              <p className="rounded-xl bg-white p-6 text-center text-sm text-muted">
                Nenhuma reserva ainda.
              </p>
            )}
            {bookings.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelected(b)}
                className="block w-full rounded-xl bg-white p-4 text-left shadow-sm"
              >
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase text-muted">
                      {format(parseISO(b.startAt), "EEE dd", { locale: ptBR })}
                    </p>
                    <p className="font-semibold">
                      {format(parseISO(b.startAt), "HH:mm")}
                    </p>
                    <p className="text-sm">{b.serviceTitle}</p>
                    {b.professionalName && (
                      <p className="text-xs text-muted">{b.professionalName}</p>
                    )}
                  </div>
                  <span className="text-xs font-semibold uppercase text-blue-600">
                    {b.status === "CONFIRMED"
                      ? "AGENDADO"
                      : b.status === "CANCELLED"
                        ? "CANCELADO"
                        : b.status}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <Link
              href={primaryPage ? `/p/${slug}/${primaryPage}` : `/p/${slug}`}
              className="btn-primary text-center"
              style={{ background: accent }}
            >
              Novo agendamento
            </Link>
          </div>
        </>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
            <div
              className="flex items-center justify-between px-4 py-3 text-white"
              style={{ background: accent }}
            >
              <span className="font-semibold">Sua Reserva</span>
              <button type="button" onClick={() => setSelected(null)}>
                ✕
              </button>
            </div>
            <div className="space-y-2 p-5 text-sm">
              <p className="font-semibold uppercase text-blue-600">
                {selected.status === "CONFIRMED" ? "AGENDADO" : selected.status}
              </p>
              <p>
                {format(parseISO(selected.startAt), "dd/MM/yy, EEEE", {
                  locale: ptBR,
                })}
              </p>
              <p>
                {format(parseISO(selected.startAt), "HH:mm")} às{" "}
                {format(parseISO(selected.endAt), "HH:mm")}
              </p>
              <p>{selected.serviceTitle}</p>
              {selected.professionalName && <p>{selected.professionalName}</p>}
            </div>
            <div className="flex gap-2 border-t border-border p-4">
              {selected.canReschedule && selected.manageToken && (
                <Link
                  href={`/m/${selected.manageToken}`}
                  className="btn-secondary flex-1 text-center !text-xs"
                >
                  Remarcar
                </Link>
              )}
              {selected.canCancel && (
                <button
                  type="button"
                  className="btn-secondary flex-1 !text-xs text-danger"
                  disabled={busy}
                  onClick={() => void cancelBooking(selected)}
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MemberReservasPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-muted">Carregando…</p>}>
      <MemberReservasInner />
    </Suspense>
  );
}
