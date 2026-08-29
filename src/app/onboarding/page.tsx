"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { AsaasIcon } from "@/components/icons/AsaasIcon";
import { MercadoPagoIcon } from "@/components/icons/MercadoPagoIcon";
import { ASAAS_ENABLED } from "@/lib/feature-flags";
import {
  maskBRLFromDigits,
  parseBRLMaskToCents,
} from "@/lib/utils";

type Step = "empresa" | "modo" | "servicos" | "pagamento" | "pronto";

type ServiceDraft = {
  title: string;
  durationMinutes: number;
  priceMask: string;
};

const STEPS: { id: Step; label: string }[] = [
  { id: "empresa", label: "Empresa" },
  { id: "modo", label: "Equipe" },
  { id: "servicos", label: "Serviços" },
  { id: "pagamento", label: "Pagamento" },
  { id: "pronto", label: "Pronto" },
];

const MAX_LOGO_BYTES = 350_000;

const POPUP_FEATURES =
  "popup=yes,width=520,height=720,left=100,top=100,scrollbars=yes,resizable=yes";

export default function OnboardingPage() {
  const router = useRouter();
  const { update } = useSession();
  const [step, setStep] = useState<Step>("empresa");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [pageSlug, setPageSlug] = useState("");
  const [publicPath, setPublicPath] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [accentColor, setAccentColor] = useState("#0a0a0a");
  const [businessMode, setBusinessMode] = useState<"SOLO" | "SALON">("SOLO");
  const [proNames, setProNames] = useState<string[]>([""]);
  const [services, setServices] = useState<ServiceDraft[]>([
    { title: "", durationMinutes: 60, priceMask: "" },
  ]);
  const [paymentChoice, setPaymentChoice] = useState<
    "MERCADO_PAGO" | "ASAAS" | "LATER"
  >("LATER");
  const [mpConnected, setMpConnected] = useState(false);
  const [asaasConnected, setAsaasConnected] = useState(false);
  const [asaasKey, setAsaasKey] = useState("");
  const [connectingMp, setConnectingMp] = useState(false);

  useEffect(() => {
    fetch("/api/onboarding")
      .then((r) => r.json())
      .then((data) => {
        if (data.completed) {
          router.replace("/app");
          return;
        }
        setName(data.name || "");
        setDescription(data.description || "");
        setLogoUrl(data.logoUrl || "");
        setAccentColor(data.accentColor || "#0a0a0a");
        setBusinessMode(data.businessMode || "SOLO");
        setOrgSlug(data.slug || "");
        setPageSlug(data.bookingPageSlug || "");
        setMpConnected(Boolean(data.mercadoPagoConnected));
        setAsaasConnected(Boolean(data.asaasConnected));
        setLoading(false);
      })
      .catch(() => {
        setError("Não foi possível carregar o assistente");
        setLoading(false);
      });
  }, [router]);

  function onLogoFile(file: File | null) {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Envie uma imagem (PNG, JPG ou WebP)");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError("Logo muito grande — use até ~350 KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  function stepIndex(id: Step) {
    return STEPS.findIndex((s) => s.id === id);
  }

  function goNext() {
    setError("");
    if (step === "empresa") {
      if (name.trim().length < 2) {
        setError("Informe o nome da empresa");
        return;
      }
      setStep("modo");
      return;
    }
    if (step === "modo") {
      if (businessMode === "SALON") {
        const names = proNames.map((n) => n.trim()).filter(Boolean);
        if (names.length < 1) {
          setError("Informe pelo menos um profissional");
          return;
        }
      }
      setStep("servicos");
      return;
    }
    if (step === "servicos") {
      const valid = services.filter((s) => s.title.trim().length >= 2);
      if (!valid.length) {
        setError("Adicione pelo menos um serviço");
        return;
      }
      for (const s of valid) {
        if (s.durationMinutes < 5) {
          setError(`Duração inválida em “${s.title}”`);
          return;
        }
      }
      setStep("pagamento");
      return;
    }
    if (step === "pagamento") {
      void finish();
    }
  }

  async function connectMercadoPago() {
    setConnectingMp(true);
    setError("");
    const popup = window.open(
      "/api/mercadopago/connect?popup=1",
      "mp_oauth",
      POPUP_FEATURES,
    );
    if (!popup) {
      setConnectingMp(false);
      setError("Permita pop-ups para conectar o Mercado Pago");
      return;
    }
    const onMsg = (ev: MessageEvent) => {
      if (ev.data?.type !== "mp-oauth") return;
      window.removeEventListener("message", onMsg);
      setConnectingMp(false);
      if (ev.data.status === "connected") {
        setMpConnected(true);
        setPaymentChoice("MERCADO_PAGO");
      } else {
        setError("Não foi possível conectar o Mercado Pago");
      }
    };
    window.addEventListener("message", onMsg);
    const timer = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(timer);
        window.removeEventListener("message", onMsg);
        setConnectingMp(false);
        fetch("/api/organization")
          .then((r) => r.json())
          .then((o) => {
            if (o.mercadoPagoConnected) {
              setMpConnected(true);
              setPaymentChoice("MERCADO_PAGO");
            }
          })
          .catch(() => undefined);
      }
    }, 800);
  }

  async function connectAsaas() {
    if (!asaasKey.trim()) {
      setError("Cole a API Key do Asaas");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/asaas/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: asaasKey.trim() }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Não foi possível conectar o Asaas");
      return;
    }
    setAsaasConnected(true);
    setPaymentChoice("ASAAS");
  }

  async function skipWizard() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/onboarding", { method: "PATCH" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSaving(false);
      setError(data.error || "Não foi possível pular o assistente");
      return;
    }
    await update();
    window.location.assign("/app");
  }

  async function finish() {
    setSaving(true);
    setError("");
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      logoUrl: logoUrl || null,
      accentColor,
      businessMode,
      professionals:
        businessMode === "SALON"
          ? proNames
              .map((n) => n.trim())
              .filter(Boolean)
              .map((displayName) => ({ displayName }))
          : [],
      services: services
        .filter((s) => s.title.trim().length >= 2)
        .map((s) => ({
          title: s.title.trim(),
          durationMinutes: s.durationMinutes,
          priceCents: parseBRLMaskToCents(s.priceMask) || 0,
        })),
      applyBusinessHours: true,
      paymentProvider: mpConnected
        ? "MERCADO_PAGO"
        : asaasConnected
          ? "ASAAS"
          : paymentChoice === "LATER"
            ? undefined
            : paymentChoice,
    };

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Não foi possível salvar");
      return;
    }

    setOrgSlug(data.organizationSlug || orgSlug);
    setPageSlug(data.bookingPageSlug || pageSlug);
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    setPublicPath(
      data.organizationSlug && data.bookingPageSlug
        ? `${origin}/p/${data.organizationSlug}/${data.bookingPageSlug}`
        : "",
    );
    await update();
    setStep("pronto");
  }

  if (loading) {
    return (
      <div className="dot-grid flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-muted">Preparando assistente…</p>
      </div>
    );
  }

  const idx = stepIndex(step);
  const progress = ((idx + 1) / STEPS.length) * 100;

  return (
    <div className="dot-grid min-h-screen px-4 py-8">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <BrandLogo href="/" size="md" showText />
          <p className="text-xs text-muted">
            Passo {idx + 1} de {STEPS.length}
          </p>
        </div>

        <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-foreground transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="surface space-y-5 p-6 sm:p-8">
          {step === "empresa" && (
            <>
              <div>
                <p className="eyebrow">Bem-vindo</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight">
                  Configure sua empresa
                </h1>
                <p className="mt-1 text-sm text-muted">
                  Em poucos minutos sua agenda e pagamentos ficam prontos para
                  receber clientes.
                </p>
              </div>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">Nome da empresa</span>
                <input
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Studio Ana"
                  autoFocus
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">
                  Descrição curta (opcional)
                </span>
                <textarea
                  className="input-field min-h-[72px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="O que você oferece"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium">Logo</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="block w-full text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-muted-bg file:px-3 file:py-2 file:text-sm file:font-medium"
                    onChange={(e) => onLogoFile(e.target.files?.[0] || null)}
                  />
                  {logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt=""
                      className="mt-2 h-12 max-w-[140px] object-contain"
                    />
                  )}
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium">Cor de destaque</span>
                  <input
                    type="color"
                    className="h-10 w-full cursor-pointer rounded-lg border border-border bg-white p-1"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                  />
                </label>
              </div>
            </>
          )}

          {step === "modo" && (
            <>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Quem atende?
                </h1>
                <p className="mt-1 text-sm text-muted">
                  Individual se for só você. Salão se a agenda tiver equipe.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setBusinessMode("SOLO")}
                  className={`rounded-2xl border p-4 text-left transition ${
                    businessMode === "SOLO"
                      ? "border-foreground bg-foreground text-white"
                      : "border-border bg-white hover:bg-muted-bg"
                  }`}
                >
                  <p className="font-semibold">Individual</p>
                  <p
                    className={`mt-1 text-xs ${
                      businessMode === "SOLO" ? "text-white/80" : "text-muted"
                    }`}
                  >
                    Uma pessoa atende. Ideal para profissionais autônomos.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setBusinessMode("SALON")}
                  className={`rounded-2xl border p-4 text-left transition ${
                    businessMode === "SALON"
                      ? "border-foreground bg-foreground text-white"
                      : "border-border bg-white hover:bg-muted-bg"
                  }`}
                >
                  <p className="font-semibold">Salão / equipe</p>
                  <p
                    className={`mt-1 text-xs ${
                      businessMode === "SALON" ? "text-white/80" : "text-muted"
                    }`}
                  >
                    Vários profissionais. O cliente escolhe quem prefere.
                  </p>
                </button>
              </div>
              {businessMode === "SALON" && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Nomes da equipe</p>
                  {proNames.map((n, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        className="input-field flex-1"
                        placeholder={`Profissional ${i + 1}`}
                        value={n}
                        onChange={(e) => {
                          const next = [...proNames];
                          next[i] = e.target.value;
                          setProNames(next);
                        }}
                      />
                      {proNames.length > 1 && (
                        <button
                          type="button"
                          className="btn-secondary !px-3"
                          onClick={() =>
                            setProNames(proNames.filter((_, j) => j !== i))
                          }
                        >
                          −
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setProNames([...proNames, ""])}
                  >
                    + Adicionar profissional
                  </button>
                  <p className="text-xs text-muted">
                    Depois você pode criar logins para cada um em Profissionais.
                  </p>
                </div>
              )}
            </>
          )}

          {step === "servicos" && (
            <>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  O que você oferece?
                </h1>
                <p className="mt-1 text-sm text-muted">
                  Cadastre os serviços principais. Horário comercial
                  (seg–sex, 9h–18h) será aplicado automaticamente — você ajusta
                  depois.
                </p>
              </div>
              <div className="space-y-4">
                {services.map((s, i) => (
                  <div
                    key={i}
                    className="space-y-3 rounded-2xl border border-border p-4"
                  >
                    <label className="block text-sm">
                      <span className="mb-1.5 block font-medium">Serviço</span>
                      <input
                        className="input-field"
                        placeholder="Ex.: Corte, Consulta, Sessão"
                        value={s.title}
                        onChange={(e) => {
                          const next = [...services];
                          next[i] = { ...s, title: e.target.value };
                          setServices(next);
                        }}
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block text-sm">
                        <span className="mb-1.5 block font-medium">
                          Duração (min)
                        </span>
                        <input
                          type="number"
                          min={5}
                          className="input-field"
                          value={s.durationMinutes}
                          onChange={(e) => {
                            const next = [...services];
                            next[i] = {
                              ...s,
                              durationMinutes: Number(e.target.value) || 30,
                            };
                            setServices(next);
                          }}
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1.5 block font-medium">Preço</span>
                        <input
                          className="input-field"
                          placeholder="R$ 0,00"
                          value={s.priceMask}
                          onChange={(e) => {
                            const next = [...services];
                            next[i] = {
                              ...s,
                              priceMask: maskBRLFromDigits(e.target.value),
                            };
                            setServices(next);
                          }}
                        />
                      </label>
                    </div>
                    {services.length > 1 && (
                      <button
                        type="button"
                        className="text-xs font-medium text-muted hover:text-foreground"
                        onClick={() =>
                          setServices(services.filter((_, j) => j !== i))
                        }
                      >
                        Remover
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    setServices([
                      ...services,
                      { title: "", durationMinutes: 60, priceMask: "" },
                    ])
                  }
                >
                  + Outro serviço
                </button>
              </div>
            </>
          )}

          {step === "pagamento" && (
            <>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Receber pagamentos
                </h1>
                <p className="mt-1 text-sm text-muted">
                  Conecte agora ou deixe para depois (modo demo até conectar).
                </p>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-border p-4">
                  <div className="flex items-center gap-3">
                    <MercadoPagoIcon size={32} />
                    <div className="flex-1">
                      <p className="font-semibold">Mercado Pago</p>
                      <p className="text-xs text-muted">
                        Pix e cartão · OAuth em um clique
                      </p>
                    </div>
                    {mpConnected ? (
                      <span className="text-xs font-semibold text-emerald-700">
                        Conectado
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={connectingMp}
                        onClick={() => void connectMercadoPago()}
                        className="btn-primary !py-2 !text-xs"
                      >
                        {connectingMp ? "Abrindo…" : "Conectar"}
                      </button>
                    )}
                  </div>
                </div>

                {ASAAS_ENABLED && (
                  <div className="rounded-2xl border border-border p-4">
                    <div className="flex items-start gap-3">
                      <AsaasIcon size={32} />
                      <div className="flex-1 space-y-2">
                        <div>
                          <p className="font-semibold">Asaas</p>
                          <p className="text-xs text-muted">
                            Pix e cartão · cole a API Key
                          </p>
                        </div>
                        {asaasConnected ? (
                          <span className="text-xs font-semibold text-emerald-700">
                            Conectado
                          </span>
                        ) : (
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                              className="input-field flex-1 font-mono text-xs"
                              placeholder="API Key Asaas"
                              value={asaasKey}
                              onChange={(e) => setAsaasKey(e.target.value)}
                            />
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => void connectAsaas()}
                              className="btn-secondary whitespace-nowrap"
                            >
                              Salvar key
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setPaymentChoice("LATER")}
                  className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    paymentChoice === "LATER" && !mpConnected && !asaasConnected
                      ? "border-foreground"
                      : "border-border"
                  }`}
                >
                  <p className="font-medium">Configurar depois</p>
                  <p className="mt-0.5 text-xs text-muted">
                    O link funciona em modo demo até você conectar um provedor.
                  </p>
                </button>
              </div>
            </>
          )}

          {step === "pronto" && (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-800">
                ✓
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Tudo pronto!
                </h1>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                  Sua agenda está configurada
                  {services[0]?.title
                    ? ` com ${services.filter((s) => s.title.trim()).length} serviço(s)`
                    : ""}
                  {businessMode === "SALON"
                    ? ` e ${proNames.filter((n) => n.trim()).length} profissional(is)`
                    : ""}
                  .
                </p>
              </div>
              {publicPath && (
                <div className="rounded-2xl border border-border bg-muted-bg/50 p-4 text-left text-sm">
                  <p className="text-xs font-medium text-muted">Link público</p>
                  <a
                    href={publicPath}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block break-all font-medium underline-offset-2 hover:underline"
                  >
                    {publicPath}
                  </a>
                </div>
              )}
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Link href="/app" className="btn-primary">
                  Ir para o painel
                </Link>
                {!mpConnected && !asaasConnected && (
                  <Link href="/app/integrations" className="btn-secondary">
                    Conectar pagamento
                  </Link>
                )}
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          {step !== "pronto" && (
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                className="btn-secondary"
                disabled={step === "empresa" || saving}
                onClick={() => {
                  setError("");
                  if (step === "modo") setStep("empresa");
                  else if (step === "servicos") setStep("modo");
                  else if (step === "pagamento") setStep("servicos");
                }}
              >
                Voltar
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={saving}
                onClick={() => goNext()}
              >
                {saving
                  ? "Salvando…"
                  : step === "pagamento"
                    ? "Concluir configuração"
                    : "Continuar"}
              </button>
            </div>
          )}
        </div>

        {step !== "pronto" && (
          <div className="mt-4 space-y-2 text-center">
            <button
              type="button"
              disabled={saving}
              onClick={() => void skipWizard()}
              className="text-sm font-medium text-muted underline-offset-2 hover:text-foreground hover:underline"
            >
              Não quero fazer isso agora
            </button>
            <p className="text-xs text-muted">
              Você configura tudo depois em Conta, Agendas e Integrações. Este
              assistente só aparece na primeira vez.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
