"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";

type FloorAnswer = { label: string; value: string };

type FloorBooking = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCpf: string | null;
  serviceTitle: string;
  serviceDescription: string | null;
  durationMinutes: number;
  pageTitle: string;
  customAnswers: FloorAnswer[];
};

type FloorPro = {
  id: string;
  displayName: string;
  photoUrl: string | null;
  bookings: FloorBooking[];
};

type FloorData = {
  date: string;
  timezone: string;
  orgName: string;
  serverNow: string;
  mode: "SOLO" | "SALON";
  professionals: FloorPro[];
};

function bookingPhase(
  b: FloorBooking,
  nowMs: number,
): "past" | "now" | "next" | "later" {
  const start = new Date(b.startAt).getTime();
  const end = new Date(b.endAt).getTime();
  if (nowMs >= start && nowMs < end) return "now";
  if (end <= nowMs) return "past";
  return "later";
}

function nextBooking(bookings: FloorBooking[], nowMs: number) {
  return (
    bookings.find((b) => {
      const phase = bookingPhase(b, nowMs);
      return phase === "now" || phase === "later";
    }) || null
  );
}

function phoneDisplay(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length >= 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
  }
  if (d.length >= 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6, 10)}`;
  }
  return phone;
}

function cpfDisplay(cpf: string) {
  const d = cpf.replace(/\D/g, "");
  if (d.length === 11) {
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  return cpf;
}

function statusLabel(status: string, phase: ReturnType<typeof bookingPhase>) {
  if (phase === "now") return "Em atendimento";
  if (phase === "past") return "Concluído";
  if (status === "PENDING_PAYMENT") return "Aguardando confirmação";
  return "Confirmado";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 border-b border-border/70 py-3 last:border-0 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="text-sm font-medium text-foreground break-words">{value}</dd>
    </div>
  );
}

function BookingDetailModal({
  booking,
  professionalName,
  timezone,
  nowMs,
  onClose,
}: {
  booking: FloorBooking;
  professionalName: string;
  timezone: string;
  nowMs: number;
  onClose: () => void;
}) {
  const titleId = useId();
  const phase = bookingPhase(booking, nowMs);
  const start = toZonedTime(parseISO(booking.startAt), timezone);
  const end = toZonedTime(parseISO(booking.endAt), timezone);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl shadow-black/15"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              Agendamento
            </p>
            <h2
              id={titleId}
              className="mt-0.5 truncate text-xl font-bold tracking-tight"
            >
              {booking.customerName}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {format(start, "HH:mm")}–{format(end, "HH:mm")} ·{" "}
              {statusLabel(booking.status, phase)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary !px-3 !py-1.5 !text-xs"
          >
            Fechar
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-2">
          <section>
            <h3 className="pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
              Cliente
            </h3>
            <dl>
              <DetailRow label="Nome" value={booking.customerName} />
              {booking.customerPhone ? (
                <DetailRow
                  label="Telefone"
                  value={phoneDisplay(booking.customerPhone)}
                />
              ) : null}
              {booking.customerEmail ? (
                <DetailRow label="E-mail" value={booking.customerEmail} />
              ) : null}
              {booking.customerCpf ? (
                <DetailRow
                  label="CPF"
                  value={cpfDisplay(booking.customerCpf)}
                />
              ) : null}
            </dl>
          </section>

          <section className="mt-2">
            <h3 className="pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
              Procedimento
            </h3>
            <dl>
              <DetailRow label="Serviço" value={booking.serviceTitle} />
              {booking.serviceDescription ? (
                <DetailRow
                  label="Detalhe"
                  value={booking.serviceDescription}
                />
              ) : null}
              <DetailRow
                label="Duração"
                value={`${booking.durationMinutes} min`}
              />
              <DetailRow label="Profissional" value={professionalName} />
              <DetailRow
                label="Horário"
                value={`${format(start, "HH:mm")} – ${format(end, "HH:mm")}`}
              />
              {booking.pageTitle ? (
                <DetailRow label="Agenda" value={booking.pageTitle} />
              ) : null}
            </dl>
          </section>

          {booking.customAnswers.length > 0 ? (
            <section className="mt-2 pb-2">
              <h3 className="pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                Informações do formulário
              </h3>
              <dl>
                {booking.customAnswers.map((a) => (
                  <DetailRow key={a.label} label={a.label} value={a.value} />
                ))}
              </dl>
            </section>
          ) : (
            <div className="pb-3" />
          )}
        </div>
      </div>
    </div>
  );
}

export default function FloorBoardPage() {
  const [data, setData] = useState<FloorData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openBookingId, setOpenBookingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/floor", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Erro ao carregar");
        return;
      }
      setData(json);
      setError("");
      setLastRefresh(new Date());
      setSelectedId((prev) => {
        if (prev && json.professionals.some((p: FloorPro) => p.id === prev)) {
          return prev;
        }
        return json.professionals[0]?.id ?? null;
      });
    } catch {
      setError("Falha de conexão — tentando de novo…");
    }
  }, []);

  useEffect(() => {
    void load();
    const poll = setInterval(() => void load(), 15_000);
    return () => clearInterval(poll);
  }, [load]);

  useEffect(() => {
    const tick = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(tick);
  }, []);

  const selected = useMemo(
    () => data?.professionals.find((p) => p.id === selectedId) || null,
    [data, selectedId],
  );

  const openBooking = useMemo(() => {
    if (!openBookingId || !data) return null;
    for (const p of data.professionals) {
      const b = p.bookings.find((x) => x.id === openBookingId);
      if (b) return { booking: b, professionalName: p.displayName };
    }
    return null;
  }, [data, openBookingId]);

  const timezone = data?.timezone || "America/Sao_Paulo";
  const dateLabel = data
    ? format(parseISO(`${data.date}T12:00:00`), "EEEE, d 'de' MMMM", {
        locale: ptBR,
      })
    : "";

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col bg-[#f4f2ef] lg:h-[calc(100dvh-3.75rem)]">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            Gestão à vista
          </p>
          <h1 className="text-lg font-bold tracking-tight capitalize md:text-xl">
            {dateLabel || "Carregando…"}
          </h1>
          {data && <p className="text-xs text-muted">{data.orgName}</p>}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800 ring-1 ring-emerald-200">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Ao vivo
          </span>
          {lastRefresh && (
            <span>Atualizado {format(lastRefresh, "HH:mm:ss")}</span>
          )}
          <button
            type="button"
            onClick={() => void load()}
            className="btn-secondary !py-1.5 !text-xs"
          >
            Atualizar
          </button>
        </div>
      </header>

      {error && (
        <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {error}
        </p>
      )}

      {!data ? (
        <p className="p-6 text-sm text-muted">Carregando painel do dia…</p>
      ) : data.professionals.length === 0 ? (
        <p className="p-6 text-sm text-muted">
          Nenhum profissional ativo. Cadastre a equipe em Profissionais.
        </p>
      ) : (
        <div className="flex min-h-0 flex-1">
          <aside className="flex w-[11.5rem] shrink-0 flex-col overflow-y-auto border-r border-border bg-white sm:w-56 md:w-64">
            <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
              Equipe
            </p>
            <ul className="flex-1 space-y-0.5 px-2 pb-4">
              {data.professionals.map((p) => {
                const next = nextBooking(p.bookings, nowMs);
                const active = p.id === selectedId;
                const countLeft = p.bookings.filter(
                  (b) => bookingPhase(b, nowMs) !== "past",
                ).length;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(p.id)}
                      className={`w-full rounded-xl px-3 py-3 text-left transition ${
                        active
                          ? "bg-foreground text-white"
                          : "hover:bg-muted-bg"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {p.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.photoUrl}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              active
                                ? "bg-white/20 text-white"
                                : "bg-muted-bg text-foreground"
                            }`}
                          >
                            {p.displayName.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {p.displayName}
                          </p>
                          <p
                            className={`truncate text-[11px] ${
                              active ? "text-white/75" : "text-muted"
                            }`}
                          >
                            {next
                              ? `${format(
                                  toZonedTime(parseISO(next.startAt), timezone),
                                  "HH:mm",
                                )} · ${next.customerName}`
                              : countLeft === 0
                                ? "Sem clientes"
                                : `${countLeft} restantes`}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <section className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
            {!selected ? (
              <p className="text-sm text-muted">Selecione um profissional.</p>
            ) : (
              <div className="mx-auto max-w-2xl space-y-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight md:text-2xl">
                    {selected.displayName}
                  </h2>
                  <p className="text-sm text-muted">
                    {selected.bookings.length} agendamento
                    {selected.bookings.length === 1 ? "" : "s"} hoje
                  </p>
                </div>

                {(() => {
                  const next = nextBooking(selected.bookings, nowMs);
                  if (!next) return null;
                  const phase = bookingPhase(next, nowMs);
                  return (
                    <button
                      type="button"
                      onClick={() => setOpenBookingId(next.id)}
                      className={`w-full rounded-2xl border-2 p-5 text-left transition hover:shadow-md ${
                        phase === "now"
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-foreground bg-white"
                      }`}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        {phase === "now" ? "Em atendimento" : "Próximo cliente"}
                      </p>
                      <p className="mt-1 text-2xl font-bold tracking-tight">
                        {next.customerName}
                      </p>
                      <p className="mt-1 text-base font-medium">
                        {next.serviceTitle}
                      </p>
                      <p className="mt-2 text-sm text-muted">
                        {format(
                          toZonedTime(parseISO(next.startAt), timezone),
                          "HH:mm",
                        )}
                        –
                        {format(
                          toZonedTime(parseISO(next.endAt), timezone),
                          "HH:mm",
                        )}{" "}
                        · {next.durationMinutes} min
                      </p>
                      <p className="mt-2 text-xs font-medium text-muted">
                        Toque para ver detalhes
                      </p>
                    </button>
                  );
                })()}

                <ul className="space-y-2">
                  {selected.bookings.length === 0 && (
                    <li className="rounded-xl border border-dashed border-border bg-white px-4 py-8 text-center text-sm text-muted">
                      Nenhum agendamento neste dia
                    </li>
                  )}
                  {selected.bookings.map((b) => {
                    const phase = bookingPhase(b, nowMs);
                    return (
                      <li key={b.id}>
                        <button
                          type="button"
                          onClick={() => setOpenBookingId(b.id)}
                          className={`w-full rounded-xl border bg-white px-4 py-3 text-left transition hover:border-foreground/40 hover:shadow-sm ${
                            phase === "now"
                              ? "border-emerald-400 ring-2 ring-emerald-200"
                              : phase === "past"
                                ? "border-border opacity-50"
                                : "border-border"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold tracking-tight">
                                {b.customerName}
                              </p>
                              <p className="text-sm text-muted">
                                {b.serviceTitle}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-bold tabular-nums">
                                {format(
                                  toZonedTime(parseISO(b.startAt), timezone),
                                  "HH:mm",
                                )}
                                –
                                {format(
                                  toZonedTime(parseISO(b.endAt), timezone),
                                  "HH:mm",
                                )}
                              </p>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                                {phase === "now"
                                  ? "Agora"
                                  : phase === "past"
                                    ? "Feito"
                                    : b.status === "PENDING_PAYMENT"
                                      ? "Aguardando"
                                      : "Confirmado"}
                              </p>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>
        </div>
      )}

      {openBooking && (
        <BookingDetailModal
          booking={openBooking.booking}
          professionalName={openBooking.professionalName}
          timezone={timezone}
          nowMs={nowMs}
          onClose={() => setOpenBookingId(null)}
        />
      )}
    </div>
  );
}
