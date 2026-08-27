"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  getDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { formatBRL, formatCpf, formatPhone, isValidCpf } from "@/lib/utils";

type CustomField = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options: string | null;
};

type Service = {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  customFields: CustomField[];
};

type PageInfo = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  accentColor: string;
  websiteUrl: string | null;
  instagram: string | null;
  timezone: string;
};

type Slot = { startAt: string; endAt: string; label: string };
type Step = "service" | "datetime" | "details" | "payment" | "done";

const STEP_LABELS: { id: Step; label: string }[] = [
  { id: "service", label: "Serviço" },
  { id: "datetime", label: "Horário" },
  { id: "details", label: "Dados" },
  { id: "payment", label: "Pagamento" },
];

function formatCardNumber(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 16);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function groupSlots(slots: Slot[]) {
  const morning: Slot[] = [];
  const afternoon: Slot[] = [];
  for (const s of slots) {
    const h = Number(s.label.split(":")[0]);
    if (h < 12) morning.push(s);
    else afternoon.push(s);
  }
  return { morning, afternoon };
}

export function BookingFunnel({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState<PageInfo | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [demoPayments, setDemoPayments] = useState(true);
  const [caktoSdkClientId, setCaktoSdkClientId] = useState<string | null>(null);

  const [step, setStep] = useState<Step>("service");
  const [service, setService] = useState<Service | null>(null);
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [timezone, setTimezone] = useState("America/Sao_Paulo");

  const [details, setDetails] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerCpf: "",
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);

  const [payMethod, setPayMethod] = useState<"pix" | "card">("pix");
  const [pixQr, setPixQr] = useState<string | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [card, setCard] = useState({
    holderName: "",
    cardNumber: "",
    cvv: "",
    expMonth: "",
    expYear: "",
  });
  const [paying, setPaying] = useState(false);

  const accent =
    page?.accentColor && page.accentColor !== "#E87722"
      ? page.accentColor
      : "#0a0a0a";

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) setTimezone(tz);
    } catch {
      /* keep default */
    }
  }, []);

  useEffect(() => {
    fetch(`/api/public/${slug}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Página não encontrada");
        return r.json();
      })
      .then((data) => {
        setPage(data.page);
        setServices(data.services);
        setAvailableDays(data.availableDays || []);
        setDemoPayments(data.demoPayments);
        setCaktoSdkClientId(data.caktoSdkClientId);
        if (!Intl?.DateTimeFormat) setTimezone(data.page.timezone);

        // Auto-skip serviço único
        if (data.services?.length === 1) {
          setService(data.services[0]);
          setStep("datetime");
          const firstDay = data.availableDays?.[0];
          if (firstDay) {
            setSelectedDate(firstDay);
            setMonth(parseISO(firstDay));
          }
        } else if (data.availableDays?.[0]) {
          setSelectedDate(data.availableDays[0]);
          setMonth(parseISO(data.availableDays[0]));
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    if (!selectedDate || !service) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    fetch(`/api/public/${slug}?date=${selectedDate}&serviceId=${service.id}`)
      .then((r) => r.json())
      .then((data) => {
        setSlots(data.slots || []);
        setSlotsLoading(false);
      })
      .catch(() => setSlotsLoading(false));
  }, [selectedDate, service, slug]);

  const startPix = useCallback(
    async (id: string) => {
      setPixLoading(true);
      setError("");
      const res = await fetch(`/api/public/${slug}/pay?method=pix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id, fingerprint: `fp_${id}` }),
      });
      const data = await res.json();
      setPixLoading(false);
      if (!res.ok) {
        setError(data.error || "Erro ao gerar Pix");
        return;
      }
      setPixQr(data.qrCode);
    },
    [slug],
  );

  // Poll status + auto Pix
  useEffect(() => {
    if (step !== "payment" || !bookingId) return;
    if (payMethod === "pix" && !pixQr && !pixLoading) {
      startPix(bookingId);
    }
  }, [step, bookingId, payMethod, pixQr, pixLoading, startPix]);

  useEffect(() => {
    if (step !== "payment" || payMethod !== "pix" || !bookingId || !pixQr) return;
    const id = setInterval(async () => {
      const res = await fetch(
        `/api/public/${slug}/status?bookingId=${bookingId}`,
      );
      const data = await res.json();
      if (data.status === "CONFIRMED") setStep("done");
    }, 2500);
    return () => clearInterval(id);
  }, [step, payMethod, bookingId, pixQr, slug]);

  const daySet = useMemo(() => new Set(availableDays), [availableDays]);
  const calendarDays = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    return eachDayOfInterval({ start, end });
  }, [month]);
  const padStart = getDay(startOfMonth(month));
  const grouped = useMemo(() => groupSlots(slots), [slots]);

  const visibleSteps = useMemo(() => {
    if (services.length <= 1) {
      return STEP_LABELS.filter((s) => s.id !== "service");
    }
    return STEP_LABELS;
  }, [services.length]);

  const stepIndex = visibleSteps.findIndex(
    (s) => s.id === (step === "done" ? "payment" : step),
  );

  function pickService(s: Service) {
    setService(s);
    setError("");
    setStep("datetime");
    if (!selectedDate && availableDays[0]) {
      setSelectedDate(availableDays[0]);
      setMonth(parseISO(availableDays[0]));
    }
  }

  function pickSlot(slot: Slot) {
    setSelectedSlot(slot);
    setStep("details");
    setError("");
  }

  async function submitDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!service || !selectedSlot) return;
    if (!isValidCpf(details.customerCpf)) {
      setError("Informe um CPF válido");
      return;
    }
    setError("");
    setPaying(true);
    const res = await fetch(`/api/public/${slug}/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: service.id,
        startAt: selectedSlot.startAt,
        timezone,
        ...details,
        customerPhone: details.customerPhone.replace(/\D/g, ""),
        customerCpf: details.customerCpf.replace(/\D/g, ""),
        customAnswers: answers,
      }),
    });
    const data = await res.json();
    setPaying(false);
    if (!res.ok) {
      setError(data.error || "Não foi possível reservar este horário");
      return;
    }
    setBookingId(data.bookingId);
    setHoldExpiresAt(data.holdExpiresAt);
    setPixQr(null);
    setStep("payment");
  }

  async function confirmDemoPix() {
    if (!bookingId) return;
    setPaying(true);
    const res = await fetch(`/api/public/${slug}/pay?method=demo-confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });
    setPaying(false);
    if (res.ok) setStep("done");
    else {
      const data = await res.json();
      setError(data.error || "Erro");
    }
  }

  async function payCard(e: React.FormEvent) {
    e.preventDefault();
    if (!bookingId) return;
    setPaying(true);
    setError("");

    let cardToken = `demo_${Date.now()}`;
    if (caktoSdkClientId && typeof window !== "undefined") {
      try {
        // @ts-expect-error Cakto global
        if (!window.Cakto) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "https://cakto-sdk.pages.dev/cakto-sdk.min.js";
            s.onload = () => resolve();
            s.onerror = () => reject(new Error("SDK falhou"));
            document.body.appendChild(s);
          });
        }
        // @ts-expect-error Cakto global
        const sdk = new window.Cakto.CaktoSDK({ client_id: caktoSdkClientId });
        const tokenized = await sdk.createToken({
          holderName: card.holderName,
          cardNumber: card.cardNumber.replace(/\D/g, ""),
          cvv: card.cvv,
          expMonth: card.expMonth.padStart(2, "0"),
          expYear: card.expYear.length === 2 ? card.expYear : card.expYear.slice(-2),
        });
        cardToken = tokenized.cardToken;
      } catch (err) {
        console.warn("Cakto SDK fallback", err);
      }
    }

    const res = await fetch(`/api/public/${slug}/pay?method=card`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId,
        fingerprint: `fp_${bookingId}`,
        cardToken,
      }),
    });
    const data = await res.json();
    setPaying(false);
    if (!res.ok) {
      setError(data.error || "Pagamento recusado");
      return;
    }
    if (data.status === "CONFIRMED") setStep("done");
    else setError(data.message || "Aguardando confirmação");
  }

  function goBack() {
    setError("");
    if (step === "datetime") {
      if (services.length > 1) {
        setStep("service");
        setService(null);
      }
    } else if (step === "details") setStep("datetime");
    else if (step === "payment") setStep("details");
  }

  if (loading) {
    return (
      <div className="dot-grid flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
          <p className="text-sm text-muted">Preparando seu agendamento…</p>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="dot-grid flex min-h-screen items-center justify-center text-sm text-danger">
        {error || "Página não encontrada"}
      </div>
    );
  }

  const whenLabel =
    selectedSlot &&
    format(
      toZonedTime(parseISO(selectedSlot.startAt), timezone),
      "EEE, d MMM · HH:mm",
      { locale: ptBR },
    );

  return (
    <div className="dot-grid min-h-screen px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-3xl">
        {/* Progress */}
        {step !== "done" && (
          <div className="mb-5 flex items-center justify-center gap-1 sm:gap-2">
            {visibleSteps.map((s, i) => {
              const active = i === stepIndex;
              const done = i < stepIndex;
              return (
                <div key={s.id} className="flex items-center gap-1 sm:gap-2">
                  {i > 0 && (
                    <div
                      className={`h-px w-4 sm:w-8 ${done || active ? "bg-foreground" : "bg-border"}`}
                    />
                  )}
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                        done || active
                          ? "bg-foreground text-white"
                          : "bg-muted-bg text-muted"
                      }`}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <span
                      className={`hidden text-xs font-medium sm:inline ${
                        active ? "text-foreground" : "text-muted"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="surface overflow-hidden shadow-sm">
          <div className="grid md:grid-cols-[240px_1fr]">
            {/* Summary sidebar */}
            <aside className="border-b border-border bg-muted-bg/40 p-5 md:border-b-0 md:border-r">
              <div
                className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg text-xs font-bold text-white"
                style={{ background: accent }}
              >
                {page.title.slice(0, 2).toUpperCase()}
              </div>
              <h1 className="text-lg font-bold tracking-tight leading-snug">
                {page.title}
              </h1>
              {page.description && !service && (
                <p className="mt-2 text-xs leading-relaxed text-muted line-clamp-4">
                  {page.description}
                </p>
              )}

              <div className="mt-5 space-y-3 text-sm">
                {service && (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                      Serviço
                    </p>
                    <p className="mt-0.5 font-medium">{service.title}</p>
                    <p className="text-muted">
                      {service.durationMinutes} min ·{" "}
                      {formatBRL(service.priceCents)}
                    </p>
                  </div>
                )}
                {whenLabel && (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                      Quando
                    </p>
                    <p className="mt-0.5 font-medium capitalize">{whenLabel}</p>
                  </div>
                )}
                {step === "payment" && holdExpiresAt && (
                  <div className="rounded-lg border border-border bg-white p-3 text-xs leading-relaxed">
                    <p className="font-semibold">Horário reservado</p>
                    <p className="mt-1 text-muted">
                      Conclua o pagamento até{" "}
                      {format(new Date(holdExpiresAt), "HH:mm")} para garantir.
                    </p>
                  </div>
                )}
              </div>
            </aside>

            {/* Main */}
            <div className="p-5 sm:p-6">
              {error && (
                <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
                  {error}
                </p>
              )}

              {step !== "service" && step !== "done" && (
                <button
                  type="button"
                  onClick={goBack}
                  className="mb-4 text-sm text-muted transition hover:text-foreground"
                >
                  ← Voltar
                </button>
              )}

              {/* SERVICE */}
              {step === "service" && (
                <div className="space-y-3 animate-in">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">
                      O que você precisa?
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      Escolha o tipo de atendimento
                    </p>
                  </div>
                  {services.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => pickService(s)}
                      className="group flex w-full items-center justify-between gap-3 rounded-lg border border-border p-4 text-left transition hover:border-foreground hover:shadow-sm"
                    >
                      <div>
                        <p className="font-semibold tracking-tight">{s.title}</p>
                        {s.description && (
                          <p className="mt-1 text-sm text-muted line-clamp-2">
                            {s.description}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="tag">{s.durationMinutes} min</span>
                          <span className="tag font-medium">
                            {formatBRL(s.priceCents)}
                          </span>
                        </div>
                      </div>
                      <span className="text-lg text-muted transition group-hover:text-foreground">
                        →
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* DATETIME */}
              {step === "datetime" && service && (
                <div className="space-y-5 animate-in">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">
                      Escolha data e horário
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      Dias disponíveis estão destacados
                    </p>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setMonth(subMonths(month, 1))}
                          className="btn-secondary !px-2.5 !py-1.5"
                          aria-label="Mês anterior"
                        >
                          ‹
                        </button>
                        <span className="text-sm font-semibold capitalize">
                          {format(month, "MMMM yyyy", { locale: ptBR })}
                        </span>
                        <button
                          type="button"
                          onClick={() => setMonth(addMonths(month, 1))}
                          className="btn-secondary !px-2.5 !py-1.5"
                          aria-label="Próximo mês"
                        >
                          ›
                        </button>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted">
                        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                          <span key={`${d}-${i}`} className="py-1">
                            {d}
                          </span>
                        ))}
                        {Array.from({ length: padStart }).map((_, i) => (
                          <span key={`pad-${i}`} />
                        ))}
                        {calendarDays.map((day) => {
                          const key = format(day, "yyyy-MM-dd");
                          const available = daySet.has(key);
                          const selected = selectedDate === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              disabled={!available}
                              onClick={() => setSelectedDate(key)}
                              className={`aspect-square rounded-lg text-sm font-medium transition ${
                                !isSameMonth(day, month) ? "opacity-25" : ""
                              } ${
                                selected
                                  ? "bg-foreground text-white"
                                  : available
                                    ? "bg-white hover:bg-muted-bg ring-1 ring-border"
                                    : "text-muted/30"
                              }`}
                            >
                              {format(day, "d")}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      {selectedDate ? (
                        <>
                          <p className="mb-3 text-sm font-semibold capitalize">
                            {format(parseISO(selectedDate), "EEEE, d 'de' MMMM", {
                              locale: ptBR,
                            })}
                          </p>
                          {slotsLoading ? (
                            <div className="flex items-center gap-2 text-sm text-muted">
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-foreground" />
                              Buscando horários…
                            </div>
                          ) : slots.length === 0 ? (
                            <p className="rounded-lg bg-muted-bg px-3 py-4 text-sm text-muted">
                              Sem horários neste dia. Escolha outra data.
                            </p>
                          ) : (
                            <div className="max-h-72 space-y-4 overflow-y-auto pr-1">
                              {grouped.morning.length > 0 && (
                                <div>
                                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">
                                    Manhã
                                  </p>
                                  <div className="grid grid-cols-3 gap-2">
                                    {grouped.morning.map((slot) => (
                                      <button
                                        key={slot.startAt}
                                        type="button"
                                        onClick={() => pickSlot(slot)}
                                        className="rounded-lg border border-border bg-white py-2.5 text-sm font-medium transition hover:border-foreground hover:bg-foreground hover:text-white"
                                      >
                                        {slot.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {grouped.afternoon.length > 0 && (
                                <div>
                                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">
                                    Tarde / noite
                                  </p>
                                  <div className="grid grid-cols-3 gap-2">
                                    {grouped.afternoon.map((slot) => (
                                      <button
                                        key={slot.startAt}
                                        type="button"
                                        onClick={() => pickSlot(slot)}
                                        className="rounded-lg border border-border bg-white py-2.5 text-sm font-medium transition hover:border-foreground hover:bg-foreground hover:text-white"
                                      >
                                        {slot.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted">
                          Selecione um dia no calendário
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* DETAILS */}
              {step === "details" && service && (
                <form onSubmit={submitDetails} className="space-y-4 animate-in">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">
                      Seus dados
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      Usamos para confirmar e enviar o comprovante
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm sm:col-span-2">
                      <span className="mb-1.5 block font-medium">Nome completo</span>
                      <input
                        required
                        autoFocus
                        className="input-field"
                        value={details.customerName}
                        onChange={(e) =>
                          setDetails({ ...details, customerName: e.target.value })
                        }
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1.5 block font-medium">E-mail</span>
                      <input
                        required
                        type="email"
                        className="input-field"
                        value={details.customerEmail}
                        onChange={(e) =>
                          setDetails({
                            ...details,
                            customerEmail: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1.5 block font-medium">Celular</span>
                      <input
                        required
                        inputMode="tel"
                        placeholder="(11) 99999-9999"
                        className="input-field"
                        value={details.customerPhone}
                        onChange={(e) =>
                          setDetails({
                            ...details,
                            customerPhone: formatPhone(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label className="block text-sm sm:col-span-2">
                      <span className="mb-1.5 block font-medium">CPF</span>
                      <input
                        required
                        inputMode="numeric"
                        placeholder="000.000.000-00"
                        className="input-field"
                        value={details.customerCpf}
                        onChange={(e) =>
                          setDetails({
                            ...details,
                            customerCpf: formatCpf(e.target.value),
                          })
                        }
                      />
                    </label>
                  </div>

                  {service.customFields.map((f) => (
                    <label key={f.id} className="block text-sm">
                      <span className="mb-1.5 block font-medium">
                        {f.label}
                        {f.required ? "" : " (opcional)"}
                      </span>
                      {f.type === "TEXTAREA" ? (
                        <textarea
                          required={f.required}
                          rows={3}
                          className="input-field"
                          value={answers[f.id] || ""}
                          onChange={(e) =>
                            setAnswers({ ...answers, [f.id]: e.target.value })
                          }
                        />
                      ) : (
                        <input
                          required={f.required}
                          className="input-field"
                          value={answers[f.id] || ""}
                          onChange={(e) =>
                            setAnswers({ ...answers, [f.id]: e.target.value })
                          }
                        />
                      )}
                    </label>
                  ))}

                  <button
                    type="submit"
                    disabled={paying}
                    className="btn-primary w-full py-3"
                  >
                    {paying ? "Reservando horário…" : "Ir para pagamento"}
                  </button>
                </form>
              )}

              {/* PAYMENT */}
              {step === "payment" && service && (
                <div className="space-y-4 animate-in">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight">
                        Pagamento
                      </h2>
                      <p className="mt-1 text-sm text-muted">
                        Seguro · via Cakto
                      </p>
                    </div>
                    <p className="text-2xl font-bold tracking-tight">
                      {formatBRL(service.priceCents)}
                    </p>
                  </div>

                  {demoPayments && (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      Modo demo — nenhum valor real será cobrado.
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {(["pix", "card"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setPayMethod(m);
                          setError("");
                        }}
                        className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                          payMethod === m
                            ? "border-foreground bg-foreground text-white"
                            : "border-border bg-white hover:bg-muted-bg"
                        }`}
                      >
                        {m === "pix" ? "Pix" : "Cartão"}
                      </button>
                    ))}
                  </div>

                  {payMethod === "pix" && (
                    <div className="space-y-3">
                      {pixLoading && (
                        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-foreground" />
                          Gerando Pix…
                        </div>
                      )}
                      {pixQr && (
                        <div className="space-y-3 rounded-lg border border-border p-4">
                          <p className="text-center text-sm font-medium">
                            Escaneie o QR ou copie o código
                          </p>
                          <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-lg bg-muted-bg text-xs text-muted">
                            QR Pix
                          </div>
                          <textarea
                            readOnly
                            className="h-20 w-full rounded-lg border border-border bg-muted-bg p-2 font-mono text-[11px]"
                            value={pixQr}
                          />
                          <button
                            type="button"
                            className="btn-secondary w-full"
                            onClick={async () => {
                              await navigator.clipboard.writeText(pixQr);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 1500);
                            }}
                          >
                            {copied ? "Código copiado!" : "Copiar código Pix"}
                          </button>
                          {demoPayments && (
                            <button
                              type="button"
                              disabled={paying}
                              onClick={confirmDemoPix}
                              className="btn-primary w-full py-3"
                            >
                              {paying
                                ? "Confirmando…"
                                : "Simular pagamento (demo)"}
                            </button>
                          )}
                          <p className="text-center text-xs text-muted">
                            Aguardando pagamento — atualiza automaticamente
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {payMethod === "card" && (
                    <form onSubmit={payCard} className="space-y-3">
                      <label className="block text-sm">
                        <span className="mb-1.5 block font-medium">
                          Nome no cartão
                        </span>
                        <input
                          required
                          className="input-field"
                          value={card.holderName}
                          onChange={(e) =>
                            setCard({ ...card, holderName: e.target.value })
                          }
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1.5 block font-medium">Número</span>
                        <input
                          required
                          inputMode="numeric"
                          placeholder="0000 0000 0000 0000"
                          className="input-field"
                          value={card.cardNumber}
                          onChange={(e) =>
                            setCard({
                              ...card,
                              cardNumber: formatCardNumber(e.target.value),
                            })
                          }
                        />
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <label className="block text-sm">
                          <span className="mb-1.5 block font-medium">Mês</span>
                          <input
                            required
                            placeholder="MM"
                            maxLength={2}
                            className="input-field"
                            value={card.expMonth}
                            onChange={(e) =>
                              setCard({
                                ...card,
                                expMonth: e.target.value.replace(/\D/g, ""),
                              })
                            }
                          />
                        </label>
                        <label className="block text-sm">
                          <span className="mb-1.5 block font-medium">Ano</span>
                          <input
                            required
                            placeholder="AA"
                            maxLength={4}
                            className="input-field"
                            value={card.expYear}
                            onChange={(e) =>
                              setCard({
                                ...card,
                                expYear: e.target.value.replace(/\D/g, ""),
                              })
                            }
                          />
                        </label>
                        <label className="block text-sm">
                          <span className="mb-1.5 block font-medium">CVC</span>
                          <input
                            required
                            maxLength={4}
                            className="input-field"
                            value={card.cvv}
                            onChange={(e) =>
                              setCard({
                                ...card,
                                cvv: e.target.value.replace(/\D/g, ""),
                              })
                            }
                          />
                        </label>
                      </div>
                      <button
                        type="submit"
                        disabled={paying}
                        className="btn-primary w-full py-3"
                      >
                        {paying ? "Processando…" : `Pagar ${formatBRL(service.priceCents)}`}
                      </button>
                      <p className="text-center text-[11px] text-muted">
                        Dados do cartão tokenizados · não passam pelo nosso
                        servidor
                      </p>
                    </form>
                  )}
                </div>
              )}

              {/* DONE */}
              {step === "done" && (
                <div className="space-y-4 py-4 text-center animate-in">
                  <div
                    className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white"
                    style={{ background: accent }}
                  >
                    ✓
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    Tudo certo!
                  </h2>
                  <p className="text-sm text-muted">
                    Agendamento confirmado. Enviamos os detalhes para{" "}
                    <strong className="text-foreground">
                      {details.customerEmail}
                    </strong>
                    .
                  </p>
                  {whenLabel && service && (
                    <div className="mx-auto max-w-sm rounded-lg border border-border bg-muted-bg/50 p-4 text-left text-sm">
                      <p className="font-semibold">{service.title}</p>
                      <p className="mt-1 capitalize text-muted">{whenLabel}</p>
                      <p className="mt-1 font-medium">
                        {formatBRL(service.priceCents)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {(page.websiteUrl || page.instagram) && (
          <p className="mt-5 text-center text-xs text-muted">
            {page.websiteUrl && (
              <a
                href={page.websiteUrl}
                className="hover:text-foreground hover:underline"
              >
                {page.websiteUrl.replace(/^https?:\/\//, "")}
              </a>
            )}
            {page.websiteUrl && page.instagram ? " · " : null}
            {page.instagram}
          </p>
        )}
      </div>
    </div>
  );
}
