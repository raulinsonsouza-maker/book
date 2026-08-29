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
import { formatBRL, DEFAULT_TIMEZONE, isValidCpf } from "@/lib/utils";
import { enabledFormFields } from "@/lib/funnel-config";
import type { FunnelConfig } from "@/types/funnel-config";
import { FunnelLandingBlocks } from "@/components/booking/FunnelLandingBlocks";
import { FunnelFormFields } from "@/components/booking/FunnelFormFields";
import { encodeAsaasCardToken } from "@/lib/asaas/client";
import { PixQrImage } from "@/components/payment/PixQrImage";

type CustomField = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options: string | null;
};

type ProOption = {
  id: string;
  displayName: string;
  photoUrl: string | null;
};

type Service = {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  customFields: CustomField[];
  professionals?: ProOption[];
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
type Step = "service" | "professional" | "datetime" | "details" | "payment" | "done";

const STEP_LABELS: { id: Step; label: string }[] = [
  { id: "service", label: "Serviço" },
  { id: "professional", label: "Profissional" },
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

export function BookingFunnel({
  orgSlug,
  pageSlug,
}: {
  orgSlug: string;
  pageSlug: string;
}) {
  const apiBase = `/api/public/${orgSlug}/${pageSlug}`;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState<PageInfo | null>(null);
  const [funnelConfig, setFunnelConfig] = useState<FunnelConfig | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [demoPayments, setDemoPayments] = useState(true);
  const [paymentProvider, setPaymentProvider] = useState<
    "CAKTO" | "MERCADO_PAGO" | "ASAAS" | "DEMO"
  >("DEMO");
  const [paymentProviderLabel, setPaymentProviderLabel] = useState("Demo");
  const [caktoSdkClientId, setCaktoSdkClientId] = useState<string | null>(null);
  const [mercadoPagoPublicKey, setMercadoPagoPublicKey] = useState<string | null>(null);

  const [step, setStep] = useState<Step>("service");
  const [businessMode, setBusinessMode] = useState<"SOLO" | "SALON">("SOLO");
  const [service, setService] = useState<Service | null>(null);
  const [professional, setProfessional] = useState<ProOption | null>(null);
  const [anyone, setAnyone] = useState(false);
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);

  const [details, setDetails] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerCpf: "",
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [manageToken, setManageToken] = useState<string | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [holdCountdown, setHoldCountdown] = useState("");
  const [awaitingCardConfirm, setAwaitingCardConfirm] = useState(false);

  const [payMethod, setPayMethod] = useState<"pix" | "card">("pix");
  const [pixQr, setPixQr] = useState<string | null>(null);
  const [pixQrBase64, setPixQrBase64] = useState<string | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [card, setCard] = useState({
    holderName: "",
    cardNumber: "",
    cvv: "",
    expMonth: "",
    expYear: "",
  });
  const [installments, setInstallments] = useState(1);
  const [cardMaxInstallments, setCardMaxInstallments] = useState(12);
  const [paying, setPaying] = useState(false);
  const [checkingPix, setCheckingPix] = useState(false);
  const [pixCheckHint, setPixCheckHint] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [showMonthCalendar, setShowMonthCalendar] = useState(false);

  const accent =
    funnelConfig?.theme.accentColor ||
    (page?.accentColor && page.accentColor !== "#E87722"
      ? page.accentColor
      : "#0a0a0a");

  const formFields = enabledFormFields(funnelConfig);
  const heroTitle = funnelConfig?.theme.heroTitle || page?.title;
  const heroSubtitle = funnelConfig?.theme.heroSubtitle || page?.description;
  const logoUrl = funnelConfig?.theme.logoUrl || page?.logoUrl;

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) setTimezone(tz);
    } catch {
      /* keep default */
    }
  }, []);

  useEffect(() => {
    fetch(`${apiBase}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Página não encontrada");
        return r.json();
      })
      .then((data) => {
        setPage(data.page);
        setFunnelConfig(data.funnelConfig || null);
        setServices(data.services);
        setAvailableDays(data.availableDays || []);
        setDemoPayments(data.demoPayments);
        setPaymentProvider(data.paymentProvider || "DEMO");
        setPaymentProviderLabel(data.paymentProviderLabel || "Demo");
        setCaktoSdkClientId(data.caktoSdkClientId);
        setMercadoPagoPublicKey(data.mercadoPagoPublicKey);
        setCardMaxInstallments(
          Math.min(12, Math.max(1, data.cardMaxInstallments || 12)),
        );
        setTimezone(data.page.timezone || DEFAULT_TIMEZONE);
        setBusinessName(data.brand?.businessName || data.page?.businessName || "");
        const mode = data.businessMode === "SALON" ? "SALON" : "SOLO";
        setBusinessMode(mode);

        // Auto-skip serviço único
        if (data.services?.length === 1) {
          setService(data.services[0]);
          if (mode === "SALON") {
            setStep("professional");
          } else {
            setStep("datetime");
            const firstDay = data.availableDays?.[0];
            if (firstDay) {
              setSelectedDate(firstDay);
              setMonth(parseISO(firstDay));
            }
          }
        } else if (data.availableDays?.[0] && mode === "SOLO") {
          setSelectedDate(data.availableDays[0]);
          setMonth(parseISO(data.availableDays[0]));
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [orgSlug, pageSlug]);

  useEffect(() => {
    if (!selectedDate || !service) return;
    if (businessMode === "SALON" && !anyone && !professional) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    const qs = new URLSearchParams({
      date: selectedDate,
      serviceId: service.id,
    });
    if (businessMode === "SALON") {
      if (anyone) qs.set("anyone", "1");
      else if (professional) qs.set("professionalId", professional.id);
    }
    fetch(`${apiBase}?${qs}`)
      .then((r) => r.json())
      .then((data) => {
        setSlots(data.slots || []);
        if (data.availableDays) setAvailableDays(data.availableDays);
        setSlotsLoading(false);
      })
      .catch(() => setSlotsLoading(false));
  }, [selectedDate, service, apiBase, businessMode, professional, anyone]);

  // Bootstrap dias disponíveis quando entra no modo profissional
  useEffect(() => {
    if (businessMode !== "SALON" || !service) return;
    if (!anyone && !professional) return;
    if (selectedDate) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const qs = new URLSearchParams({
      date: today,
      serviceId: service.id,
    });
    if (anyone) qs.set("anyone", "1");
    else if (professional) qs.set("professionalId", professional.id);
    fetch(`${apiBase}?${qs}`)
      .then((r) => r.json())
      .then((data) => {
        const days: string[] = data.availableDays || [];
        if (days.length) {
          setAvailableDays(days);
          setSelectedDate(days[0]);
          setMonth(parseISO(days[0]));
        } else {
          setAvailableDays([]);
        }
        setSlots(data.slots || []);
      })
      .catch(() => undefined);
  }, [businessMode, service, professional, anyone, selectedDate, apiBase]);

  const startPix = useCallback(
    async (id: string) => {
      setPixLoading(true);
      setError("");
      const res = await fetch(`${apiBase}/pay?method=pix`, {
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
      setPixQrBase64(data.qrCodeBase64 || null);
    },
    [orgSlug, pageSlug],
  );

  // Poll status + auto Pix
  useEffect(() => {
    if (step !== "payment" || !bookingId) return;
    if (payMethod === "pix" && !pixQr && !pixLoading) {
      startPix(bookingId);
    }
  }, [step, bookingId, payMethod, pixQr, pixLoading, startPix]);

  const daySet = useMemo(() => new Set(availableDays), [availableDays]);
  const weekDays = useMemo(() => availableDays.slice(0, 7), [availableDays]);
  const calendarDays = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    return eachDayOfInterval({ start, end });
  }, [month]);
  const padStart = getDay(startOfMonth(month));
  const grouped = useMemo(() => groupSlots(slots), [slots]);

  const visibleSteps = useMemo(() => {
    let steps = STEP_LABELS;
    if (services.length <= 1) {
      steps = steps.filter((s) => s.id !== "service");
    }
    if (businessMode !== "SALON") {
      steps = steps.filter((s) => s.id !== "professional");
    }
    return steps;
  }, [services.length, businessMode]);

  const stepIndex = visibleSteps.findIndex(
    (s) => s.id === (step === "done" ? "payment" : step),
  );
  const progressPct =
    step === "done"
      ? 100
      : Math.round(((Math.max(stepIndex, 0) + 1) / Math.max(visibleSteps.length, 1)) * 100);

  function pickService(s: Service) {
    setService(s);
    setError("");
    setSelectedSlot(null);
    setProfessional(null);
    setAnyone(false);
    if (businessMode === "SALON") {
      setStep("professional");
      return;
    }
    setStep("datetime");
    if (!selectedDate && availableDays[0]) {
      setSelectedDate(availableDays[0]);
      setMonth(parseISO(availableDays[0]));
    }
  }

  function pickProfessional(p: ProOption | null, asAnyone = false) {
    setAnyone(asAnyone);
    setProfessional(asAnyone ? null : p);
    setError("");
    setSelectedSlot(null);
    setSelectedDate(null);
    setSlots([]);
    setStep("datetime");
  }

  function pickSlot(slot: Slot) {
    setSelectedSlot(slot);
    setError("");
  }

  function confirmSlot() {
    if (!selectedSlot) return;
    setStep("details");
    setError("");
  }

  function selectDate(key: string) {
    setSelectedDate(key);
    setSelectedSlot(null);
    setMonth(parseISO(key));
  }

  async function refreshSlotsForDate(date: string) {
    if (!service) return;
    if (businessMode === "SALON" && !anyone && !professional) return;
    setSlotsLoading(true);
    try {
      const qs = new URLSearchParams({ date, serviceId: service.id });
      if (businessMode === "SALON") {
        if (anyone) qs.set("anyone", "1");
        else if (professional) qs.set("professionalId", professional.id);
      }
      const res = await fetch(`${apiBase}?${qs}`);
      const data = await res.json();
      setSlots(data.slots || []);
      if (data.availableDays) setAvailableDays(data.availableDays);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }

  function handleSlotUnavailable(message: string) {
    setBookingId(null);
    setManageToken(null);
    setHoldExpiresAt(null);
    setPixQr(null);
    setPixQrBase64(null);
    setAwaitingCardConfirm(false);
    setSelectedSlot(null);
    setStep("datetime");
    setError(message || "Este horário não está mais disponível. Escolha outro.");
    if (selectedDate) {
      void refreshSlotsForDate(selectedDate);
    }
  }

  useEffect(() => {
    if (!holdExpiresAt || step !== "payment") {
      setHoldCountdown("");
      return;
    }
    const tick = () => {
      const ms = new Date(holdExpiresAt).getTime() - Date.now();
      if (ms <= 0) {
        setHoldCountdown("0:00");
        return;
      }
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setHoldCountdown(`${m}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [holdExpiresAt, step]);

  useEffect(() => {
    if (step !== "payment" || !bookingId) return;
    if (payMethod === "pix" && !pixQr) return;
    if (payMethod === "card" && !awaitingCardConfirm) return;

    let cancelled = false;

    async function checkOnce() {
      try {
        const res = await fetch(
          `${apiBase}/status?bookingId=${bookingId}`,
          { cache: "no-store" },
        );
        const data = await res.json();
        if (cancelled) return;
        if (data.status === "CONFIRMED" || data.paymentStatus === "PAID") {
          setStep("done");
          setAwaitingCardConfirm(false);
          return;
        }
        if (data.status === "EXPIRED" || data.status === "CANCELLED") {
          handleHoldExpired(
            data.status === "EXPIRED"
              ? "O tempo para pagar acabou. Escolha o horário de novo."
              : "Este horário não está mais disponível. Escolha outro.",
          );
        }
      } catch {
        /* keep polling */
      }
    }

    void checkOnce();
    const id = setInterval(() => void checkOnce(), 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [step, payMethod, bookingId, pixQr, awaitingCardConfirm, apiBase]);

  useEffect(() => {
    if (
      step === "payment" &&
      holdCountdown === "0:00" &&
      holdExpiresAt &&
      new Date(holdExpiresAt).getTime() <= Date.now()
    ) {
      handleHoldExpired(
        "O tempo para pagar acabou. Escolha o horário de novo.",
      );
    }
  }, [holdCountdown, holdExpiresAt, step]);

  function handleHoldExpired(message: string) {
    setBookingId(null);
    setManageToken(null);
    setHoldExpiresAt(null);
    setPixQr(null);
    setPixQrBase64(null);
    setAwaitingCardConfirm(false);
    setSelectedSlot(null);
    setStep("datetime");
    setError(message);
    if (selectedDate) {
      void refreshSlotsForDate(selectedDate);
    }
  }

  async function checkPixNow() {
    if (!bookingId || checkingPix) return;
    setCheckingPix(true);
    setPixCheckHint("Consultando pagamento…");
    try {
      const res = await fetch(`${apiBase}/status?bookingId=${bookingId}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.status === "CONFIRMED" || data.paymentStatus === "PAID") {
        setStep("done");
        setAwaitingCardConfirm(false);
        return;
      }
      if (data.status === "EXPIRED" || data.status === "CANCELLED") {
        handleHoldExpired(
          data.status === "EXPIRED"
            ? "O tempo para pagar acabou. Escolha o horário de novo."
            : "Este horário não está mais disponível. Escolha outro.",
        );
        return;
      }
      setPixCheckHint(
        "Ainda não identificamos o pagamento. Se já pagou, aguarde alguns segundos e toque de novo.",
      );
    } catch {
      setPixCheckHint("Falha ao verificar. Tente novamente.");
    } finally {
      setCheckingPix(false);
    }
  }

  async function abandonHold() {
    if (!bookingId) return;
    try {
      await fetch(`${apiBase}/pay?method=abandon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
    } catch {
      /* ignore */
    }
    setBookingId(null);
    setManageToken(null);
    setHoldExpiresAt(null);
    setPixQr(null);
    setPixQrBase64(null);
    setAwaitingCardConfirm(false);
  }

  async function submitDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!service || !selectedSlot) return;

    const cpfField = formFields.find((f) => f.preset === "customerCpf" && f.enabled);
    if (cpfField?.required && !isValidCpf(details.customerCpf)) {
      setError("Informe um CPF válido");
      return;
    }
    if (cpfField?.required && !details.customerCpf) {
      setError("Informe o CPF");
      return;
    }

    for (const field of formFields) {
      if (!field.preset && field.required && !answers[field.id]?.trim()) {
        setError(`Preencha: ${field.label}`);
        return;
      }
    }

    setError("");
    setPaying(true);
    const customAnswers: Record<string, string> = {};
    for (const field of formFields) {
      if (!field.preset && answers[field.id]?.trim()) {
        customAnswers[field.id] = answers[field.id].trim();
      }
    }

    const payload: Record<string, unknown> = {
      serviceId: service.id,
      startAt: selectedSlot.startAt,
      timezone,
      customerName: details.customerName,
      customAnswers: Object.keys(customAnswers).length ? customAnswers : undefined,
      ...(businessMode === "SALON"
        ? anyone
          ? { anyone: true }
          : professional
            ? { professionalId: professional.id }
            : {}
        : {}),
    };
    for (const field of formFields) {
      if (field.preset === "customerEmail") payload.customerEmail = details.customerEmail;
      if (field.preset === "customerPhone") payload.customerPhone = details.customerPhone.replace(/\D/g, "");
      if (field.preset === "customerCpf" && details.customerCpf) {
        payload.customerCpf = details.customerCpf.replace(/\D/g, "");
      }
    }

    const res = await fetch(`${apiBase}/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setPaying(false);
    if (!res.ok) {
      if (res.status === 409 || data.code === "SLOT_UNAVAILABLE") {
        handleSlotUnavailable(data.error);
        return;
      }
      setError(data.error || "Não foi possível reservar este horário");
      return;
    }
    setBookingId(data.bookingId);
    setManageToken(data.manageToken || null);
    setHoldExpiresAt(data.holdExpiresAt);
    setPixQr(null);
    setPixQrBase64(null);
    setAwaitingCardConfirm(false);
    setStep("payment");
  }

  async function confirmDemoPix() {
    if (!bookingId) return;
    setPaying(true);
    const res = await fetch(`${apiBase}/pay?method=demo-confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });
    setPaying(false);
    if (res.ok) setStep("done");
    else {
      const data = await res.json();
      if (res.status === 409 || data.code === "SLOT_UNAVAILABLE") {
        handleSlotUnavailable(data.error);
        return;
      }
      setError(data.error || "Erro");
    }
  }

  async function payCard(e: React.FormEvent) {
    e.preventDefault();
    if (!bookingId) return;
    setPaying(true);
    setError("");

    let cardToken = `demo_${Date.now()}`;
    if (paymentProvider === "ASAAS") {
      const cpf = details.customerCpf.replace(/\D/g, "");
      if (!isValidCpf(cpf)) {
        setPaying(false);
        setError("Informe um CPF válido para pagar com cartão");
        return;
      }
      cardToken = encodeAsaasCardToken({
        holderName: card.holderName,
        number: card.cardNumber,
        expiryMonth: card.expMonth,
        expiryYear: card.expYear,
        ccv: card.cvv,
      });
    } else if (
      paymentProvider === "MERCADO_PAGO" &&
      mercadoPagoPublicKey &&
      typeof window !== "undefined"
    ) {
      try {
        // @ts-expect-error MercadoPago global
        if (!window.MercadoPago) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "https://sdk.mercadopago.com/js/v2";
            s.onload = () => resolve();
            s.onerror = () => reject(new Error("SDK Mercado Pago falhou"));
            document.body.appendChild(s);
          });
        }
        const cpf = details.customerCpf.replace(/\D/g, "");
        if (!isValidCpf(cpf)) {
          setPaying(false);
          setError("Informe um CPF válido para pagar com cartão");
          return;
        }
        // @ts-expect-error MercadoPago global
        const mp = new window.MercadoPago(mercadoPagoPublicKey);
        const tokenized = await mp.createCardToken({
          cardNumber: card.cardNumber.replace(/\D/g, ""),
          cardholderName: card.holderName,
          cardExpirationMonth: card.expMonth.padStart(2, "0"),
          cardExpirationYear:
            card.expYear.length === 2 ? `20${card.expYear}` : card.expYear,
          securityCode: card.cvv,
          identificationType: "CPF",
          identificationNumber: cpf,
        });
        cardToken = tokenized.id;
      } catch (err) {
        setPaying(false);
        setError(err instanceof Error ? err.message : "Erro ao tokenizar cartão");
        return;
      }
    } else if (caktoSdkClientId && typeof window !== "undefined") {
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

    const res = await fetch(`${apiBase}/pay?method=card`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId,
        fingerprint: `fp_${bookingId}`,
        cardToken,
        installments:
          paymentProvider === "MERCADO_PAGO" || paymentProvider === "ASAAS"
            ? Math.min(installments, cardMaxInstallments)
            : 1,
      }),
    });
    const data = await res.json();
    setPaying(false);
    if (!res.ok) {
      if (res.status === 409 || data.code === "SLOT_UNAVAILABLE") {
        handleSlotUnavailable(data.error);
        return;
      }
      setError(data.error || "Pagamento recusado");
      return;
    }
    if (data.status === "CONFIRMED") setStep("done");
    else {
      setAwaitingCardConfirm(true);
      setError("");
      setPixCheckHint(
        "Pagamento em análise. A tela atualiza sozinha — ou toque em verificar.",
      );
    }
  }

  function canGoBack() {
    if (step === "professional") return services.length > 1;
    if (step === "datetime") {
      return businessMode === "SALON" || services.length > 1;
    }
    if (step === "details" || step === "payment") return true;
    return false;
  }

  function goBack() {
    if (!canGoBack()) return;
    setError("");
    if (step === "professional") {
      setStep("service");
      setService(null);
      setProfessional(null);
      setAnyone(false);
    } else if (step === "datetime") {
      setSelectedSlot(null);
      if (businessMode === "SALON") {
        setStep("professional");
        setProfessional(null);
        setAnyone(false);
      } else {
        setStep("service");
        setService(null);
      }
    } else if (step === "details") setStep("datetime");
    else if (step === "payment") {
      void abandonHold();
      setStep("details");
    }
  }

  if (loading) {
    return (
      <div className="booking-shell flex min-h-dvh items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3">
          <div
            className="h-9 w-9 animate-spin rounded-full border-2 border-transparent"
            style={{
              borderTopColor: accent,
              borderRightColor: accent,
            }}
          />
          <p className="text-sm text-muted">Preparando seu agendamento…</p>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="booking-shell flex min-h-dvh items-center justify-center px-4 text-sm text-danger">
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

  const currentStepLabel =
    step === "done"
      ? "Confirmado"
      : visibleSteps[Math.max(stepIndex, 0)]?.label || "";

  const showDock = step === "datetime" && Boolean(selectedSlot);

  return (
    <div
      className="booking-shell"
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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white"
              style={{ background: accent }}
            >
              {(businessName || heroTitle || "BS").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            {businessName && (
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                {businessName}
              </p>
            )}
            <p className="truncate text-sm font-semibold tracking-tight">
              {heroTitle}
            </p>
          </div>
          {step !== "done" && (
            <p className="shrink-0 rounded-full bg-black/[0.04] px-2.5 py-1 text-[11px] font-medium text-muted">
              {Math.max(stepIndex, 0) + 1}/{visibleSteps.length}
            </p>
          )}
        </div>
        {step !== "done" && (
          <div className="mx-auto max-w-lg px-4 pb-3">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-foreground">
                {currentStepLabel}
              </p>
              {(service || professional || anyone || whenLabel) && (
                <p className="truncate text-[11px] text-muted">
                  {[
                    service?.title,
                    anyone
                      ? "Qualquer disponível"
                      : professional?.displayName,
                    whenLabel,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>
            <div className="booking-progress" aria-hidden>
              <span style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        )}
      </header>

      <main
        className={`mx-auto w-full max-w-lg px-4 pb-8 pt-5 ${
          showDock ? "pb-36" : "pb-10"
        }`}
      >
        {canGoBack() && (
          <button
            type="button"
            onClick={goBack}
            className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted transition hover:text-foreground"
          >
            ← Voltar
          </button>
        )}

        {error && (
          <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}

        {!loading && page && services.length === 0 && (
          <div className="booking-card space-y-2 p-6 text-center">
            <h1 className="text-lg font-semibold tracking-tight">
              Agenda em configuração
            </h1>
            <p className="text-sm text-muted">
              Esta página ainda não tem serviços disponíveis. Volte em breve ou
              fale com {businessName || "a empresa"}.
            </p>
          </div>
        )}

        {step === "service" && services.length > 0 && (
          <div className="space-y-4 animate-in">
            <div>
              <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight">
                Escolha o atendimento
              </h1>
              {heroSubtitle ? (
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {heroSubtitle}
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted">
                  Selecione o serviço para ver os horários disponíveis
                </p>
              )}
            </div>

            {funnelConfig?.blocks && funnelConfig.blocks.length > 0 && (
              <div className="booking-card p-4">
                <FunnelLandingBlocks blocks={funnelConfig.blocks} />
              </div>
            )}

            <div className="space-y-3">
              {services.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pickService(s)}
                  className="booking-service group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-semibold tracking-tight">
                        {s.title}
                      </p>
                      {s.description && (
                        <p className="mt-1 text-sm leading-relaxed text-muted line-clamp-3">
                          {s.description}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="tag">{s.durationMinutes} min</span>
                        <span
                          className="rounded-md px-2 py-0.5 text-xs font-bold text-white"
                          style={{ background: accent }}
                        >
                          {formatBRL(s.priceCents)}
                        </span>
                      </div>
                    </div>
                    <span
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white transition group-hover:scale-105"
                      style={{ background: accent }}
                    >
                      →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PROFESSIONAL */}
        {step === "professional" && service && (
          <div className="space-y-4 animate-in">
            <div>
              <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight">
                Com quem você prefere?
              </h1>
              <p className="mt-2 text-sm text-muted">
                {service.title} · escolha o profissional ou qualquer disponível
              </p>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => pickProfessional(null, true)}
                className="booking-service group"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
                    style={{ background: accent }}
                  >
                    ?
                  </span>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="font-semibold tracking-tight">Qualquer disponível</p>
                    <p className="text-sm text-muted">Primeiro horário livre entre a equipe</p>
                  </div>
                  <span className="text-muted">→</span>
                </div>
              </button>
              {(service.professionals || []).map((pro) => (
                <button
                  key={pro.id}
                  type="button"
                  onClick={() => pickProfessional(pro)}
                  className="booking-service group"
                >
                  <div className="flex items-center gap-3">
                    {pro.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pro.photoUrl}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                        style={{ background: accent }}
                      >
                        {pro.displayName.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <p className="min-w-0 flex-1 text-left font-semibold tracking-tight">
                      {pro.displayName}
                    </p>
                    <span className="text-muted">→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* DATETIME */}
        {step === "datetime" && service && (
          <div className="space-y-5 animate-in">
            <div>
              <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight">
                Escolha o dia e o horário
              </h1>
              {(heroSubtitle || service.description) && (
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {heroSubtitle || service.description}
                </p>
              )}
            </div>

            <div className="booking-card px-4 py-3.5">
              <p className="text-sm font-semibold tracking-tight">
                {service.title}
              </p>
              {service.description &&
                service.description !== heroSubtitle && (
                  <p className="mt-1 text-sm leading-relaxed text-muted line-clamp-4">
                    {service.description}
                  </p>
                )}
              {(anyone || professional) && (
                <p className="mt-1 text-xs text-muted">
                  {anyone
                    ? "Qualquer profissional disponível"
                    : professional?.displayName}
                </p>
              )}
              <div className="mt-2.5 flex flex-wrap gap-2">
                <span className="tag">{service.durationMinutes} min</span>
                <span
                  className="rounded-md px-2 py-0.5 text-xs font-bold text-white"
                  style={{ background: accent }}
                >
                  {formatBRL(service.priceCents)}
                </span>
              </div>
            </div>

            <div className="booking-card overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <p className="text-sm font-semibold tracking-tight">
                  {showMonthCalendar ? "Calendário" : "Próximos dias"}
                </p>
                <div
                  className="inline-flex rounded-lg bg-muted-bg p-0.5"
                  role="group"
                  aria-label="Visualização do calendário"
                >
                  <button
                    type="button"
                    onClick={() => setShowMonthCalendar(false)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                      !showMonthCalendar
                        ? "bg-white text-foreground shadow-sm"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    Semana
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMonthCalendar(true)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                      showMonthCalendar
                        ? "bg-white text-foreground shadow-sm"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    Mês
                  </button>
                </div>
              </div>

              {!showMonthCalendar ? (
                <div className="-mx-0 flex gap-2 overflow-x-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {weekDays.length === 0 ? (
                    <p className="text-sm text-muted">Nenhum dia disponível.</p>
                  ) : (
                    weekDays.map((key) => {
                      const d = parseISO(key);
                      const selected = selectedDate === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => selectDate(key)}
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
              ) : (
                <div className="px-4 py-4">
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
                  <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-muted">
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
                          onClick={() => {
                            selectDate(key);
                            setShowMonthCalendar(false);
                          }}
                          className={`aspect-square rounded-xl text-sm font-semibold transition ${
                            !isSameMonth(day, month) ? "opacity-25" : ""
                          } ${
                            selected
                              ? "text-white"
                              : available
                                ? "bg-white ring-1 ring-border hover:bg-muted-bg"
                                : "text-muted/30"
                          }`}
                          style={
                            selected ? { background: accent } : undefined
                          }
                        >
                          {format(day, "d")}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="booking-card p-4">
              {selectedDate ? (
                <>
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
                      {grouped.morning.length > 0 && (
                        <div>
                          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                            Manhã
                          </p>
                          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                            {grouped.morning.map((slot) => (
                              <button
                                key={slot.startAt}
                                type="button"
                                onClick={() => pickSlot(slot)}
                                className={`booking-slot ${
                                  selectedSlot?.startAt === slot.startAt
                                    ? "booking-slot-selected"
                                    : "hover:border-foreground/40"
                                }`}
                              >
                                {slot.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {grouped.afternoon.length > 0 && (
                        <div>
                          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                            Tarde
                          </p>
                          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                            {grouped.afternoon.map((slot) => (
                              <button
                                key={slot.startAt}
                                type="button"
                                onClick={() => pickSlot(slot)}
                                className={`booking-slot ${
                                  selectedSlot?.startAt === slot.startAt
                                    ? "booking-slot-selected"
                                    : "hover:border-foreground/40"
                                }`}
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
                <p className="py-6 text-center text-sm text-muted">
                  Selecione um dia para ver os horários
                </p>
              )}
            </div>
          </div>
        )}

        {/* DETAILS */}
        {step === "details" && service && (
          <form onSubmit={submitDetails} className="space-y-5 animate-in">
            <div>
              <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight">
                Quase lá
              </h1>
              <p className="mt-2 text-sm text-muted">
                Seus dados para confirmar e enviar o comprovante
              </p>
            </div>

            {(service || whenLabel) && (
              <div className="booking-card flex items-center justify-between gap-3 px-4 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{service.title}</p>
                  {whenLabel && (
                    <p className="mt-0.5 truncate text-xs capitalize text-muted">
                      {whenLabel}
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-sm font-bold" style={{ color: accent }}>
                  {formatBRL(service.priceCents)}
                </p>
              </div>
            )}

            <div className="booking-card space-y-4 p-4">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <FunnelFormFields
                  fields={formFields}
                  values={answers}
                  onChange={(id, v) => setAnswers({ ...answers, [id]: v })}
                  details={details}
                  onDetailsChange={(patch) => setDetails({ ...details, ...patch })}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={paying}
              className="btn-primary w-full !rounded-2xl !py-3.5 text-base"
            >
              {paying ? "Reservando horário…" : "Continuar para pagamento"}
            </button>
          </form>
        )}

        {/* PAYMENT */}
        {step === "payment" && service && (
          <div className="space-y-5 animate-in">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight">
                  Pagamento
                </h1>
                <p className="mt-2 text-sm text-muted">
                  Seguro · via {paymentProviderLabel}
                </p>
              </div>
              <p className="text-2xl font-bold tracking-tight" style={{ color: accent }}>
                {formatBRL(service.priceCents)}
              </p>
            </div>

            {holdExpiresAt && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <p className="font-semibold">
                  Horário reservado
                  {holdCountdown ? ` · ${holdCountdown}` : ""}
                </p>
                <p className="mt-1 text-xs text-amber-900/80">
                  Conclua até {format(new Date(holdExpiresAt), "HH:mm")} para
                  garantir. Depois disso o horário é liberado.
                </p>
              </div>
            )}

            {demoPayments && (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Modo demo — nenhum valor real será cobrado.
              </p>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              {(["pix", "card"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setPayMethod(m);
                    setError("");
                  }}
                  className={`rounded-2xl border px-3 py-3.5 text-sm font-semibold transition ${
                    payMethod === m
                      ? "border-transparent text-white"
                      : "border-border bg-white hover:bg-muted-bg"
                  }`}
                  style={
                    payMethod === m ? { background: accent } : undefined
                  }
                >
                  {m === "pix" ? "Pix" : "Cartão"}
                </button>
              ))}
            </div>

            {payMethod === "pix" && (
              <div className="space-y-3">
                {pixLoading && (
                  <div className="booking-card flex items-center justify-center gap-2 py-12 text-sm text-muted">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-foreground" />
                    Gerando Pix…
                  </div>
                )}
                {pixQr && (
                  <div className="booking-card space-y-3 p-4">
                    <p className="text-center text-sm font-medium">
                      Escaneie o QR ou copie o código
                    </p>
                    <PixQrImage payload={pixQr} base64={pixQrBase64} />
                    <textarea
                      readOnly
                      className="h-20 w-full rounded-xl border border-border bg-muted-bg p-2.5 font-mono text-[11px]"
                      value={pixQr}
                    />
                    <button
                      type="button"
                      className="btn-secondary w-full !rounded-2xl !py-3"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(pixQr);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                        } catch {
                          setPixCheckHint(
                            "Não foi possível copiar. Selecione o código e copie manualmente.",
                          );
                        }
                      }}
                    >
                      {copied ? "Código copiado!" : "Copiar código Pix"}
                    </button>
                    {demoPayments && (
                      <button
                        type="button"
                        disabled={paying}
                        onClick={confirmDemoPix}
                        className="btn-primary w-full !rounded-2xl !py-3.5"
                      >
                        {paying ? "Confirmando…" : "Simular pagamento (demo)"}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={checkingPix}
                      onClick={() => void checkPixNow()}
                      className="btn-primary w-full !rounded-2xl !py-3.5"
                    >
                      {checkingPix
                        ? "Verificando…"
                        : "Já paguei — verificar agora"}
                    </button>
                    <p className="text-center text-xs text-muted">
                      {pixCheckHint ||
                        "A tela atualiza sozinha a cada poucos segundos após o Pix. Se demorar, use o botão acima."}
                    </p>
                  </div>
                )}
              </div>
            )}

            {payMethod === "card" && (
              <form onSubmit={payCard} className="booking-card space-y-3.5 p-4">
                {awaitingCardConfirm && (
                  <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                    <p className="font-medium">Pagamento em análise</p>
                    <p className="text-xs text-amber-900/80">
                      {pixCheckHint ||
                        "Aguardando confirmação do cartão. A tela atualiza sozinha."}
                    </p>
                    <button
                      type="button"
                      disabled={checkingPix}
                      onClick={() => void checkPixNow()}
                      className="btn-primary w-full !rounded-2xl !py-3"
                    >
                      {checkingPix
                        ? "Verificando…"
                        : "Já paguei — verificar agora"}
                    </button>
                  </div>
                )}
                {(paymentProvider === "MERCADO_PAGO" ||
                  paymentProvider === "ASAAS") &&
                  cardMaxInstallments > 0 &&
                  !awaitingCardConfirm && (
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium">Parcelas</span>
                    <select
                      className="input-field"
                      value={Math.min(installments, cardMaxInstallments)}
                      onChange={(e) =>
                        setInstallments(Number(e.target.value) || 1)
                      }
                    >
                      {Array.from(
                        { length: cardMaxInstallments },
                        (_, i) => i + 1,
                      ).map((n) => (
                        <option key={n} value={n}>
                          {n === 1
                            ? `À vista — ${formatBRL(service.priceCents)}`
                            : `${n}x de ${formatBRL(Math.ceil(service.priceCents / n))}`}
                        </option>
                      ))}
                    </select>
                    {cardMaxInstallments === 1 ? (
                      <span className="mt-1 block text-[11px] text-muted">
                        Esta empresa aceita apenas pagamento à vista no cartão.
                      </span>
                    ) : (
                      <span className="mt-1 block text-[11px] text-muted">
                        Até {cardMaxInstallments}x. Juros, se houver, seguem a
                        conta {paymentProvider === "ASAAS"
                          ? "Asaas"
                          : "Mercado Pago"}{" "}
                        do vendedor.
                      </span>
                    )}
                  </label>
                )}
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium">Nome no cartão</span>
                  <input
                    required
                    className="input-field"
                    autoComplete="cc-name"
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
                    autoComplete="cc-number"
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
                <div className="grid grid-cols-3 gap-2.5">
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium">Mês</span>
                    <input
                      required
                      inputMode="numeric"
                      placeholder="MM"
                      maxLength={2}
                      autoComplete="cc-exp-month"
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
                      inputMode="numeric"
                      placeholder="AA"
                      maxLength={4}
                      autoComplete="cc-exp-year"
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
                      inputMode="numeric"
                      maxLength={4}
                      autoComplete="cc-csc"
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
                  disabled={paying || awaitingCardConfirm}
                  className="btn-primary w-full !rounded-2xl !py-3.5 text-base"
                >
                  {paying
                    ? "Processando…"
                    : awaitingCardConfirm
                      ? "Aguardando confirmação…"
                      : `Pagar ${formatBRL(service.priceCents)}`}
                </button>
                <p className="text-center text-[11px] text-muted">
                  Dados do cartão tokenizados · não passam pelo nosso servidor
                </p>
              </form>
            )}
          </div>
        )}

        {/* DONE */}
        {step === "done" && (
          <div className="space-y-5 py-6 text-center animate-in">
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl text-white shadow-lg"
              style={{
                background: accent,
                boxShadow: `0 12px 28px color-mix(in srgb, ${accent} 35%, transparent)`,
              }}
            >
              ✓
            </div>
            <div>
              <h1 className="text-[1.75rem] font-bold tracking-tight">
                Agendado!
              </h1>
              {details.customerEmail?.includes("@") ? (
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
                  Confirmação enviada para{" "}
                  <strong className="text-foreground">
                    {details.customerEmail}
                  </strong>
                </p>
              ) : (
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
                  Seu horário está confirmado. Guarde os detalhes abaixo.
                </p>
              )}
            </div>
            {whenLabel && service && (
              <div className="booking-card mx-auto max-w-sm p-5 text-left text-sm">
                {businessName && (
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                    {businessName}
                  </p>
                )}
                <p className="mt-1 font-semibold tracking-tight">{service.title}</p>
                <p className="mt-1 capitalize text-muted">{whenLabel}</p>
                <p className="mt-3 text-base font-bold" style={{ color: accent }}>
                  {formatBRL(service.priceCents)}
                </p>
              </div>
            )}
            {manageToken && (
              <a
                href={`/m/${manageToken}`}
                className="inline-flex text-sm font-medium underline-offset-2 hover:underline"
                style={{ color: accent }}
              >
                Remarcar ou ver detalhes
              </a>
            )}
          </div>
        )}

        {(page.websiteUrl || page.instagram) && step !== "datetime" && (
          <p className="mt-8 text-center text-xs text-muted">
            {page.websiteUrl && (
              <a
                href={page.websiteUrl}
                className="hover:text-foreground hover:underline"
              >
                {page.websiteUrl.replace(/^https?:\/\//, "")}
              </a>
            )}
            {page.websiteUrl && page.instagram ? " · " : null}
            {page.instagram && (
              <a
                href={
                  page.instagram.startsWith("http")
                    ? page.instagram
                    : `https://instagram.com/${page.instagram.replace(/^@/, "")}`
                }
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground hover:underline"
              >
                {page.instagram.startsWith("@")
                  ? page.instagram
                  : `@${page.instagram.replace(/^@/, "").replace(/.*instagram\.com\//, "")}`}
              </a>
            )}
          </p>
        )}
      </main>

      {showDock && selectedSlot && service && (
        <div className="booking-dock fixed inset-x-0 bottom-0 z-40">
          <div className="mx-auto flex max-w-lg items-center gap-3 px-4 pt-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold tracking-tight">
                {selectedSlot.label}
                <span className="font-normal text-muted">
                  {" "}
                  ·{" "}
                  {selectedDate &&
                    format(parseISO(selectedDate), "d MMM", { locale: ptBR })}
                </span>
              </p>
              <p className="truncate text-xs text-muted">
                {service.title} · {formatBRL(service.priceCents)}
              </p>
            </div>
            <button
              type="button"
              onClick={confirmSlot}
              className="btn-primary shrink-0 !rounded-2xl !px-5 !py-3"
            >
              Continuar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
