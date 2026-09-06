"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { ContaStep } from "@/components/onboarding/steps/ContaStep";
import { EmpresaStep } from "@/components/onboarding/steps/EmpresaStep";
import { EquipeStep } from "@/components/onboarding/steps/EquipeStep";
import { ExpedienteStep } from "@/components/onboarding/steps/ExpedienteStep";
import { ProntoStep } from "@/components/onboarding/steps/ProntoStep";
import { SegmentoStep } from "@/components/onboarding/steps/SegmentoStep";
import { ServicosStep } from "@/components/onboarding/steps/ServicosStep";
import {
  DEFAULT_COMMERCIAL_HOURS,
  ONBOARDING_DRAFT_KEY,
  visibleOnboardingSteps,
  type AvailabilityRuleDraft,
  type OnboardingDraft,
  type OnboardingStepId,
  type ProDraft,
  type ServiceDraft,
} from "@/components/onboarding/types";
import { DESCRIPTION_MAX } from "@/lib/branding";
import { PLATFORM_PLAN_SLUGS, type PlatformPlanSlug } from "@/lib/billing/plans-catalog";
import { readLogoFile } from "@/lib/image-upload";
import {
  clearVerticalCookie,
  defaultCopy,
  getVertical,
  getVerticalCookie,
  parseVerticalSlug,
  setVerticalCookie,
  type VerticalSlug,
} from "@/lib/onboarding/verticals";
import { centsToBRLMask, parseBRLMaskToCents } from "@/lib/utils";
import { toE164 } from "@/lib/whatsapp/phone";

function servicesFromVertical(slug: VerticalSlug | null): ServiceDraft[] {
  const v = getVertical(slug);
  if (!v) return [];
  return v.suggestedServices.map((s) => ({
    title: s.title,
    durationMinutes: s.durationMinutes,
    priceMask: centsToBRLMask(s.priceCents),
  }));
}

function resolvePageDescription(
  description: string,
  vertical: VerticalSlug | null,
  businessName: string,
) {
  const trimmed = description.trim();
  if (trimmed.length >= 2) return trimmed.slice(0, DESCRIPTION_MAX);
  const v = getVertical(vertical);
  if (v) {
    return v.descriptionPlaceholder
      .replace(/^Ex\.:\s*/i, "")
      .slice(0, DESCRIPTION_MAX);
  }
  const name = businessName.trim() || "seu negócio";
  return `Agendamentos em ${name}`.slice(0, DESCRIPTION_MAX);
}

function isLikelyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isLikelyPhone(value: string) {
  return Boolean(toE164(value));
}

function professionalsFromDraft(draft: OnboardingDraft): ProDraft[] {
  if (draft.professionals?.length) {
    return draft.professionals.map((p) => ({
      displayName: p.displayName || "",
      email: p.email || "",
      phone: p.phone || "",
    }));
  }
  if (draft.proNames?.length) {
    return draft.proNames.map((n) => ({
      displayName: n,
      email: "",
      phone: "",
    }));
  }
  return [{ displayName: "", email: "", phone: "" }];
}

function loadDraft(): OnboardingDraft | null {
  try {
    const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingDraft;
  } catch {
    return null;
  }
}

function saveDraft(draft: OnboardingDraft) {
  try {
    localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* quota */
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(ONBOARDING_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus, update } = useSession();
  const [step, setStep] = useState<OnboardingStepId>("segmento");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [publicPath, setPublicPath] = useState("");

  const [vertical, setVertical] = useState<VerticalSlug | null>(null);
  const [pickedVertical, setPickedVertical] = useState(false);
  const servicesHydrated = useRef(false);
  const draftLoaded = useRef(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [accentColor, setAccentColor] = useState("#0a0a0a");
  const [businessMode, setBusinessMode] = useState<"SOLO" | "SALON">("SOLO");
  const [professionals, setProfessionals] = useState<ProDraft[]>([
    { displayName: "", email: "", phone: "" },
  ]);
  const [services, setServices] = useState<ServiceDraft[]>([]);
  const [hours, setHours] = useState<AvailabilityRuleDraft[]>(DEFAULT_COMMERCIAL_HOURS);
  const [planSlug, setPlanSlug] = useState<PlatformPlanSlug>(
    PLATFORM_PLAN_SLUGS.semester,
  );
  const [accountName, setAccountName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const isLoggedInWithOrg = Boolean(
    sessionStatus === "authenticated" && session?.user?.organizationId,
  );

  const needsSegmento = !pickedVertical && !isLoggedInWithOrg;
  const stepOrder = useMemo(() => {
    const mid: OnboardingStepId[] = ["empresa", "modo", "servicos", "expediente"];
    if (isLoggedInWithOrg) {
      return needsSegmento
        ? (["segmento", ...mid, "pronto"] as OnboardingStepId[])
        : ([...mid, "pronto"] as OnboardingStepId[]);
    }
    return needsSegmento
      ? (["segmento", ...mid, "conta", "pronto"] as OnboardingStepId[])
      : ([...mid, "conta", "pronto"] as OnboardingStepId[]);
  }, [needsSegmento, isLoggedInWithOrg]);

  const sidebarSteps = useMemo(() => {
    let steps = visibleOnboardingSteps(needsSegmento);
    if (isLoggedInWithOrg) {
      steps = steps.filter((s) => s.id !== "conta");
    }
    return steps;
  }, [needsSegmento, isLoggedInWithOrg]);

  useEffect(() => {
    const tipo =
      parseVerticalSlug(searchParams.get("tipo")) || getVerticalCookie();
    if (tipo) {
      setVertical(tipo);
      setPickedVertical(true);
      setVerticalCookie(tipo);
      setStep((s) => (s === "segmento" ? "empresa" : s));
    }

    const draft = loadDraft();
    if (draft && !draftLoaded.current) {
      draftLoaded.current = true;
      if (draft.vertical) {
        const v = parseVerticalSlug(draft.vertical);
        if (v) {
          setVertical(v);
          setPickedVertical(true);
        }
      }
      setName(draft.name || "");
      setDescription(draft.description || "");
      setLogoUrl(draft.logoUrl || "");
      setAccentColor(draft.accentColor || "#0a0a0a");
      setBusinessMode(draft.businessMode || "SOLO");
      setProfessionals(professionalsFromDraft(draft));
      setServices(draft.services || []);
      setHours(draft.hours?.length ? draft.hours : DEFAULT_COMMERCIAL_HOURS);
      if (draft.planSlug === PLATFORM_PLAN_SLUGS.monthly || draft.planSlug === PLATFORM_PLAN_SLUGS.semester) {
        setPlanSlug(draft.planSlug);
      }
      if (draft.step && draft.step !== "pronto") setStep(draft.step);
      if (draft.services?.length) servicesHydrated.current = true;
    }

    if (sessionStatus === "authenticated" && session?.user?.organizationId) {
      fetch("/api/onboarding")
        .then((r) => r.json())
        .then((data) => {
          if (data.completed) {
            router.replace("/app");
            return;
          }
          if (data.name) setName(data.name);
          if (data.description) setDescription(data.description);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else if (sessionStatus !== "loading") {
      setLoading(false);
    }
  }, [searchParams, sessionStatus, session, router]);

  useEffect(() => {
    if (loading || servicesHydrated.current) return;
    if (!vertical) return;
    setServices(servicesFromVertical(vertical));
    servicesHydrated.current = true;
  }, [loading, vertical]);

  useEffect(() => {
    if (loading) return;
    saveDraft({
      vertical,
      name,
      description,
      logoUrl,
      accentColor,
      businessMode,
      professionals,
      services,
      hours,
      planSlug,
      step,
    });
  }, [
    loading,
    vertical,
    name,
    description,
    logoUrl,
    accentColor,
    businessMode,
    professionals,
    services,
    hours,
    planSlug,
    step,
  ]);

  const verticalConfig = getVertical(vertical);
  const copy = verticalConfig
    ? {
        nameQuestion: verticalConfig.nameQuestion,
        namePlaceholder: verticalConfig.namePlaceholder,
        descriptionPlaceholder: verticalConfig.descriptionPlaceholder,
        servicesLead: verticalConfig.servicesLead,
      }
    : defaultCopy();

  function onLogoFile(file: File | null) {
    setError("");
    readLogoFile(file, setLogoUrl, setError);
  }

  function applyVertical(slug: VerticalSlug) {
    setVertical(slug);
    setPickedVertical(true);
    setVerticalCookie(slug);
    setServices(servicesFromVertical(slug));
    servicesHydrated.current = true;
    setError("");
    setStep("empresa");
  }

  function validProfessionalsPayload() {
    return professionals
      .map((p) => ({
        displayName: p.displayName.trim().slice(0, 80),
        email: p.email.trim().toLowerCase(),
        phone: toE164(p.phone) || "",
      }))
      .filter(
        (p) =>
          p.displayName.length >= 2 &&
          isLikelyEmail(p.email) &&
          Boolean(p.phone),
      );
  }

  function validateStep(id: OnboardingStepId): string | null {
    if (id === "segmento") {
      if (!vertical) return "Escolha o segmento do seu negócio";
      return null;
    }
    if (id === "empresa") {
      if (name.trim().length < 2) return "Informe o nome da empresa (mín. 2 caracteres)";
      if (description.trim().length > DESCRIPTION_MAX) {
        return `A descrição pode ter no máximo ${DESCRIPTION_MAX} caracteres`;
      }
      return null;
    }
    if (id === "modo") {
      if (businessMode === "SALON") {
        const filled = professionals.filter(
          (p) =>
            p.displayName.trim().length >= 2 ||
            p.email.trim().length > 0 ||
            p.phone.trim().length > 0,
        );
        if (!filled.length) {
          return "Informe pelo menos um profissional com nome, e-mail e WhatsApp";
        }
        for (const p of filled) {
          if (p.displayName.trim().length < 2) {
            return "Informe o nome de cada profissional (mín. 2 caracteres)";
          }
          if (!isLikelyEmail(p.email)) {
            return "Informe um e-mail válido para cada profissional";
          }
          if (!isLikelyPhone(p.phone)) {
            return "Informe um WhatsApp válido com DDD (ex.: 11 99999-9999)";
          }
        }
        const emails = filled.map((p) => p.email.trim().toLowerCase());
        if (new Set(emails).size !== emails.length) {
          return "Os e-mails dos profissionais precisam ser diferentes";
        }
        const phones = filled
          .map((p) => toE164(p.phone))
          .filter(Boolean) as string[];
        if (new Set(phones).size !== phones.length) {
          return "Os WhatsApp dos profissionais precisam ser diferentes";
        }
      }
      return null;
    }
    if (id === "servicos") {
      const filled = services.filter((s) => s.title.trim().length > 0);
      if (!filled.length) return "Adicione pelo menos um serviço";
      return null;
    }
    if (id === "expediente") {
      if (!hours.length) return "Selecione ao menos um dia de atendimento";
      return null;
    }
    if (id === "conta") {
      if (accountName.trim().length < 2) return "Informe seu nome";
      if (!email.includes("@")) return "Informe um e-mail válido";
      if (!isLikelyPhone(phone)) {
        return "Informe um WhatsApp válido com DDD (ex.: 11 99999-9999)";
      }
      if (password.length < 6) return "Senha com mínimo de 6 caracteres";
      if (businessMode === "SALON") {
        const owner = email.trim().toLowerCase();
        const clash = validProfessionalsPayload().some((p) => p.email === owner);
        if (clash) {
          return "O e-mail da sua conta não pode ser o mesmo de um profissional";
        }
        const ownerPhone = toE164(phone);
        if (
          ownerPhone &&
          validProfessionalsPayload().some((p) => p.phone === ownerPhone)
        ) {
          return "O WhatsApp da sua conta não pode ser o mesmo de um profissional";
        }
      }
      return null;
    }
    return null;
  }

  function goBack() {
    setError("");
    const idx = stepOrder.indexOf(step);
    if (idx > 0) setStep(stepOrder[idx - 1]!);
  }

  function goNext() {
    const msg = validateStep(step);
    if (msg) {
      setError(msg);
      return;
    }
    setError("");
    if (step === "conta") {
      void finishCheckout();
      return;
    }
    const idx = stepOrder.indexOf(step);
    if (idx >= 0 && idx < stepOrder.length - 1) {
      const next = stepOrder[idx + 1]!;
      if (next === "pronto" && isLoggedInWithOrg) {
        void finishLoggedIn();
        return;
      }
      setStep(next);
    }
  }

  async function finishLoggedIn() {
    const bad = (["empresa", "modo", "servicos", "expediente"] as OnboardingStepId[])
      .map((id) => ({ id, msg: validateStep(id) }))
      .find((x) => x.msg);
    if (bad) {
      setStep(bad.id);
      setError(bad.msg || "Revise os dados");
      return;
    }

    const validServices = services
      .filter((s) => s.title.trim().length >= 2)
      .map((s) => ({
        title: s.title.trim().slice(0, 80),
        durationMinutes: Math.min(480, Math.max(5, Number(s.durationMinutes) || 30)),
        priceCents: parseBRLMaskToCents(s.priceMask) || 0,
      }));
    const validPros =
      businessMode === "SALON" ? validProfessionalsPayload() : [];

    setSaving(true);
    setError("");
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: resolvePageDescription(description, vertical, name),
        logoUrl: logoUrl || null,
        accentColor,
        businessMode,
        professionals: validPros,
        services: validServices,
        availabilityRules: hours,
        applyBusinessHours: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Não foi possível salvar");
      return;
    }
    clearDraft();
    await update();
    const sub = await fetch("/api/billing/subscribe", { method: "POST" });
    const subData = await sub.json().catch(() => ({}));
    if (sub.ok && subData.initPoint) {
      window.location.assign(subData.initPoint);
      return;
    }
    window.location.assign("/app");
  }

  async function finishCheckout() {
    const bad = (["empresa", "modo", "servicos", "expediente", "conta"] as OnboardingStepId[])
      .map((id) => ({ id, msg: validateStep(id) }))
      .find((x) => x.msg);
    if (bad) {
      setStep(bad.id);
      setError(bad.msg || "Revise os dados");
      return;
    }

    const validServices = services
      .filter((s) => s.title.trim().length >= 2)
      .map((s) => ({
        title: s.title.trim().slice(0, 80),
        durationMinutes: Math.min(480, Math.max(5, Number(s.durationMinutes) || 30)),
        priceCents: parseBRLMaskToCents(s.priceMask) || 0,
      }));
    const validPros =
      businessMode === "SALON" ? validProfessionalsPayload() : [];

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountName: accountName.trim(),
          email: email.trim(),
          phone: toE164(phone) || phone.trim(),
          password,
          planSlug,
          name: name.trim(),
          description: resolvePageDescription(description, vertical, name),
          logoUrl: logoUrl || null,
          accentColor,
          businessMode,
          professionals: validPros,
          services: validServices,
          availabilityRules: hours,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaving(false);
        setError(data.error || "Não foi possível criar a conta");
        return;
      }

      const sign = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (sign?.error) {
        setSaving(false);
        setError("Conta criada, mas o login falhou. Entre em /login.");
        return;
      }

      await update();
      clearDraft();
      clearVerticalCookie();

      if (data.billingSkipped) {
        window.location.assign(data.redirectTo || "/app");
        return;
      }

      window.location.assign(data.redirectTo || "/onboarding/pagamento");
    } catch {
      setSaving(false);
      setError("Erro de rede ao criar a conta");
    }
  }

  if (loading || sessionStatus === "loading") {
    return (
      <div className="onboard-shell flex items-center justify-center px-4">
        <p className="text-sm text-[var(--lp-steel)]">Preparando…</p>
      </div>
    );
  }

  const showBack = step !== stepOrder[0] && step !== "pronto";
  const primaryLabel = saving
    ? "Processando…"
    : step === "conta"
      ? "Ir para o pagamento"
      : step === "servicos"
        ? "Salvar"
        : "Continuar";

  const skipLabel =
    step === "expediente"
      ? "Usar horário comercial padrão"
      : step === "modo"
        ? "Continuar sozinho"
        : step === "servicos"
          ? undefined
          : step === "segmento" || step === "empresa"
            ? undefined
            : undefined;

  function onSkip() {
    if (step === "expediente") {
      setHours(DEFAULT_COMMERCIAL_HOURS);
      setError("");
      setStep("conta");
      return;
    }
    if (step === "modo") {
      setBusinessMode("SOLO");
      setError("");
      setStep("servicos");
    }
  }

  return (
    <OnboardingShell
      step={step}
      steps={sidebarSteps}
      sidebarTitle={
        step === "conta" || step === "pronto"
          ? "Pronto!"
          : "Poucos passos para transformar seu negócio"
      }
      showBack={showBack}
      onBack={goBack}
      skipLabel={skipLabel}
      onSkip={onSkip}
      skipDisabled={saving}
    >
      <div className="onboard-panel space-y-5">
        {step === "segmento" && (
          <SegmentoStep vertical={vertical} onSelect={applyVertical} />
        )}

        {step === "empresa" && (
          <EmpresaStep
            name={name}
            description={description}
            logoUrl={logoUrl}
            accentColor={accentColor}
            nameQuestion={copy.nameQuestion}
            namePlaceholder={copy.namePlaceholder}
            descriptionPlaceholder={copy.descriptionPlaceholder}
            showVerticalPicker={false}
            vertical={vertical}
            onVerticalChange={applyVertical}
            onNameChange={setName}
            onDescriptionChange={setDescription}
            onAccentChange={setAccentColor}
            onLogoFile={onLogoFile}
            onClearLogo={() => setLogoUrl("")}
            onClearError={() => setError("")}
          />
        )}

        {step === "modo" && (
          <EquipeStep
            businessMode={businessMode}
            professionals={professionals}
            onModeChange={setBusinessMode}
            onProfessionalsChange={setProfessionals}
            onClearError={() => setError("")}
          />
        )}

        {step === "servicos" && (
          <ServicosStep
            services={services}
            servicesLead={copy.servicesLead}
            onChange={setServices}
            onClearError={() => setError("")}
          />
        )}

        {step === "expediente" && (
          <ExpedienteStep rules={hours} onChange={setHours} />
        )}

        {step === "conta" && (
          <ContaStep
            accountName={accountName}
            email={email}
            phone={phone}
            password={password}
            planSlug={planSlug}
            onAccountNameChange={setAccountName}
            onEmailChange={setEmail}
            onPhoneChange={setPhone}
            onPasswordChange={setPassword}
            onPlanChange={setPlanSlug}
            onClearError={() => setError("")}
          />
        )}

        {step === "pronto" && (
          <ProntoStep
            publicPath={publicPath}
            serviceCount={services.filter((s) => s.title.trim()).length}
            businessMode={businessMode}
            proCount={professionals.filter((p) => p.displayName.trim()).length}
            mpConnected={false}
            asaasConnected={false}
          />
        )}

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        )}

        {step !== "pronto" && step !== "segmento" && (
          <div className="pt-2">
            <button
              type="button"
              className="btn-primary w-full py-3"
              disabled={saving}
              onClick={() => goNext()}
            >
              {primaryLabel}
            </button>
          </div>
        )}
      </div>
    </OnboardingShell>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="onboard-shell flex items-center justify-center px-4">
          <p className="text-sm text-[var(--lp-steel)]">Preparando…</p>
        </div>
      }
    >
      <OnboardingWizard />
    </Suspense>
  );
}
