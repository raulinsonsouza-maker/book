"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DESCRIPTION_MAX } from "@/lib/branding";
import { readLogoFile } from "@/lib/image-upload";
import { formatBRL } from "@/lib/utils";
import { useHostProductBrand } from "@/hooks/useProductBrand";
import {
  profileOptions,
  type BusinessProfileId,
} from "@/lib/business-profile";
import {
  PLATFORM_PLAN_FALLBACKS,
  PLATFORM_PLAN_SLUGS,
} from "@/lib/billing/plans-catalog";

function billingStatusLabel(status: string | null | undefined) {
  switch (status) {
    case "ACTIVE":
      return "Ativa";
    case "TRIALING":
      return "Em trial";
    case "PAST_DUE":
      return "Pagamento pendente";
    case "CANCELED":
    case "CANCELLED":
      return "Cancelada";
    case "INACTIVE":
      return "Inativa";
    default:
      return status || "—";
  }
}

type BillingStatus = {
  billingEnabled: boolean;
  mpConfigured: boolean;
  status: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  plan: {
    name: string;
    priceCents: number;
    slug?: string;
    interval?: string;
  } | null;
};

type Org = {
  name: string;
  description: string | null;
  logoUrl: string | null;
  accentColor: string;
  businessMode: "SOLO" | "SALON";
  businessProfile?: BusinessProfileId;
  notifyClientConfirmation: boolean;
  notifyClientReminder: boolean;
  notifyClientFeedback: boolean;
  notifyProNewBooking: boolean;
  notifyProCancellation: boolean;
  notifyProReschedule: boolean;
  reminderHoursBefore: number;
  cardMaxInstallments: number;
};

const PROFILE_VISUAL: Record<
  BusinessProfileId,
  { mark: string; blurb: string }
> = {
  SALON: { mark: "Sa", blurb: "Salão, beleza e estética" },
  BARBER: { mark: "Ba", blurb: "Barbearia e grooming" },
  CLINIC: { mark: "Cl", blurb: "Consultório e clínica" },
  STUDIO: { mark: "Es", blurb: "Estúdio e bem-estar" },
};

function ToggleRow({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="settings-toggle-row">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`settings-switch ${checked ? "is-on" : ""}`}
        onClick={() => onChange(!checked)}
      >
        <span className="settings-switch-knob" />
      </button>
    </label>
  );
}

export function NegocioPanel() {
  const brand = useHostProductBrand();
  const router = useRouter();
  const [org, setOrg] = useState<Org | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [accentColor, setAccentColor] = useState("#0a0a0a");
  const [comms, setComms] = useState({
    notifyClientConfirmation: true,
    notifyClientReminder: true,
    notifyClientFeedback: false,
    notifyProNewBooking: true,
    notifyProCancellation: false,
    notifyProReschedule: false,
    reminderHoursBefore: 24,
  });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingComms, setSavingComms] = useState(false);
  const [savingMode, setSavingMode] = useState(false);
  const [businessMode, setBusinessMode] = useState<"SOLO" | "SALON">("SOLO");
  const [businessProfile, setBusinessProfile] =
    useState<BusinessProfileId>("SALON");
  const [savingProfile, setSavingProfile] = useState(false);
  const [cardMaxInstallments, setCardMaxInstallments] = useState(12);
  const [savingInstallments, setSavingInstallments] = useState(false);
  const [billing, setBilling] = useState<BillingStatus | null>(null);

  useEffect(() => {
    fetch("/api/organization")
      .then((r) => r.json())
      .then((data: Org) => {
        setOrg(data);
        setName(data.name);
        setDescription(data.description || "");
        setLogoUrl(data.logoUrl || "");
        setAccentColor(data.accentColor || "#0a0a0a");
        setBusinessMode(data.businessMode || "SOLO");
        setBusinessProfile(data.businessProfile || "SALON");
        setCardMaxInstallments(data.cardMaxInstallments || 12);
        setComms({
          notifyClientConfirmation: data.notifyClientConfirmation,
          notifyClientReminder: data.notifyClientReminder,
          notifyClientFeedback: data.notifyClientFeedback,
          notifyProNewBooking: data.notifyProNewBooking,
          notifyProCancellation: data.notifyProCancellation,
          notifyProReschedule: data.notifyProReschedule,
          reminderHoursBefore: data.reminderHoursBefore,
        });
      });
    fetch("/api/billing/status")
      .then((r) => r.json())
      .then((data: BillingStatus) => setBilling(data));
  }, []);

  async function saveInstallments(e: React.FormEvent) {
    e.preventDefault();
    setSavingInstallments(true);
    setError("");
    const res = await fetch("/api/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardMaxInstallments }),
    });
    const data = await res.json();
    setSavingInstallments(false);
    if (!res.ok) {
      setError(data.error || "Não foi possível salvar parcelas");
      return;
    }
    setCardMaxInstallments(data.cardMaxInstallments);
    setMsg(
      data.cardMaxInstallments === 1
        ? "Cartão só à vista"
        : `Máximo de ${data.cardMaxInstallments}x no cartão`,
    );
    setTimeout(() => setMsg(""), 2500);
  }

  async function saveProfile(next: BusinessProfileId) {
    setSavingProfile(true);
    setError("");
    const res = await fetch("/api/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessProfile: next }),
    });
    const data = await res.json();
    setSavingProfile(false);
    if (!res.ok) {
      setError(data.error || "Não foi possível salvar o perfil");
      return;
    }
    setBusinessProfile(data.businessProfile || next);
    setOrg(data);
    setMsg("Perfil de negócio atualizado");
    setTimeout(() => setMsg(""), 2500);
    window.location.reload();
  }

  async function saveMode(next: "SOLO" | "SALON") {
    setSavingMode(true);
    setError("");
    const res = await fetch("/api/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessMode: next }),
    });
    const data = await res.json();
    setSavingMode(false);
    if (!res.ok) {
      setError(data.error || "Não foi possível alterar o modo");
      return;
    }
    setBusinessMode(data.businessMode);
    setOrg(data);
    window.location.assign(
      data.businessMode === "SALON" ? "/app/profissionais" : "/app",
    );
  }

  function onLogoFile(file: File | null) {
    setError("");
    readLogoFile(file, setLogoUrl, setError);
  }

  async function saveOrg(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description.trim() || null,
        logoUrl: logoUrl.trim() || null,
        accentColor,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Não foi possível salvar");
      return;
    }
    setOrg(data);
    setMsg(
      "Identidade salva — checkout, agendamento e declarações usam esses dados",
    );
    setTimeout(() => setMsg(""), 3500);
  }

  async function saveComms(e: React.FormEvent) {
    e.preventDefault();
    setSavingComms(true);
    const res = await fetch("/api/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(comms),
    });
    const data = await res.json();
    setSavingComms(false);
    if (!res.ok) {
      setError(data.error || "Não foi possível salvar comunicação");
      return;
    }
    setOrg(data);
    setMsg("Comunicação salva");
    setTimeout(() => setMsg(""), 2000);
  }

  if (!org) {
    return <p className="text-sm text-muted">Carregando…</p>;
  }

  const previewName = name.trim() || "Sua empresa";
  const previewDesc = description.trim().slice(0, DESCRIPTION_MAX);
  const monthlyPlan = PLATFORM_PLAN_FALLBACKS.find(
    (p) => p.slug === PLATFORM_PLAN_SLUGS.monthly,
  )!;
  const semesterPlan = PLATFORM_PLAN_FALLBACKS.find(
    (p) => p.slug === PLATFORM_PLAN_SLUGS.semester,
  )!;
  const currentSlug = billing?.plan?.slug;
  const needsPay =
    Boolean(billing?.billingEnabled) &&
    billing?.status !== "ACTIVE" &&
    Boolean(billing?.mpConfigured);

  function goCheckout(slug: string) {
    setCheckoutBusy(slug);
    router.push(`/onboarding/pagamento?plan=${encodeURIComponent(slug)}`);
  }

  return (
    <div className="settings-account-stack space-y-5">
      {msg ? <p className="settings-flash is-ok">{msg}</p> : null}
      {error ? <p className="settings-flash is-err">{error}</p> : null}

      {billing?.billingEnabled ? (
        <section className="settings-card settings-card-billing">
          <div className="settings-card-head">
            <div>
              <p className="settings-card-kicker">Assinatura</p>
              <h2>{brand.name}</h2>
            </div>
            <span
              className={`settings-status-pill ${
                billing.status === "ACTIVE" || billing.status === "TRIALING"
                  ? "is-active"
                  : "is-muted"
              }`}
            >
              {billingStatusLabel(billing.status)}
            </span>
          </div>
          <div className="settings-stat-row">
            {billing.plan ? (
              <div>
                <p className="settings-stat-label">Plano atual</p>
                <p className="settings-stat-value">{billing.plan.name}</p>
              </div>
            ) : null}
            {billing.trialEndsAt ? (
              <div>
                <p className="settings-stat-label">Fim do trial</p>
                <p className="settings-stat-value">
                  {new Date(billing.trialEndsAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
            ) : null}
            {billing.currentPeriodEnd ? (
              <div>
                <p className="settings-stat-label">Próximo ciclo</p>
                <p className="settings-stat-value">
                  {new Date(billing.currentPeriodEnd).toLocaleDateString(
                    "pt-BR",
                  )}
                </p>
              </div>
            ) : null}
          </div>

          {needsPay ? (
            <div className="settings-plan-picker">
              <p className="settings-card-lead !mt-4">
                Escolha o plano e pague com Pix ou cartão.
              </p>
              <div className="settings-plan-grid">
                <button
                  type="button"
                  disabled={checkoutBusy !== null}
                  onClick={() => goCheckout(monthlyPlan.slug)}
                  className={`settings-plan-card ${
                    currentSlug === monthlyPlan.slug ? "is-current" : ""
                  }`}
                >
                  <span className="settings-plan-tag">Mensal</span>
                  <strong>{formatBRL(monthlyPlan.priceCents)}/mês</strong>
                  <em>Cobrança todo mês</em>
                  <span className="settings-plan-cta">
                    {checkoutBusy === monthlyPlan.slug
                      ? "Abrindo…"
                      : "Assinar mensal"}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={checkoutBusy !== null}
                  onClick={() => goCheckout(semesterPlan.slug)}
                  className={`settings-plan-card is-highlight ${
                    currentSlug === semesterPlan.slug ? "is-current" : ""
                  }`}
                >
                  <span className="settings-plan-tag">
                    {semesterPlan.badge || "Semestral"}
                  </span>
                  <strong>
                    {formatBRL(semesterPlan.monthlyEquivalentCents!)}
                    <span>/mês</span>
                  </strong>
                  <em>{semesterPlan.detail}</em>
                  <span className="settings-plan-cta">
                    {checkoutBusy === semesterPlan.slug
                      ? "Abrindo…"
                      : "Assinar semestral"}
                  </span>
                </button>
              </div>
            </div>
          ) : null}

          {billing.status !== "ACTIVE" && !billing.mpConfigured ? (
            <p className="settings-card-note">
              Assinatura online em breve. Entre em contato com o suporte.
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <p className="settings-card-kicker">Segmento</p>
            <h2>Meu negócio é</h2>
          </div>
        </div>
        <p className="settings-card-lead">
          Ajusta nomes (cliente ou paciente) e o que o painel destaca. Não apaga
          dados.
        </p>
        <div className="settings-choice-grid">
          {profileOptions().map((opt) => {
            const visual = PROFILE_VISUAL[opt.id];
            const selected = businessProfile === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={savingProfile || selected}
                onClick={() => void saveProfile(opt.id)}
                className={`settings-choice ${selected ? "is-selected" : ""}`}
              >
                <span className="settings-choice-glyph" aria-hidden>
                  {visual.mark}
                </span>
                <span className="settings-choice-copy">
                  <strong>{opt.label}</strong>
                  <em>{visual.blurb}</em>
                  <small>Lista de {opt.clientNounPlural.toLowerCase()}</small>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <p className="settings-card-kicker">Operação</p>
            <h2>Modo de operação</h2>
          </div>
        </div>
        <p className="settings-card-lead">
          Individual: um calendário. Com equipe: vários profissionais na agenda.
        </p>
        <div className="settings-choice-grid settings-choice-grid-2">
          <button
            type="button"
            disabled={savingMode || businessMode === "SOLO"}
            onClick={() => void saveMode("SOLO")}
            className={`settings-choice ${
              businessMode === "SOLO" ? "is-selected" : ""
            }`}
          >
            <span className="settings-choice-glyph" aria-hidden>
              1
            </span>
            <span className="settings-choice-copy">
              <strong>Individual</strong>
              <em>Um profissional, um calendário</em>
            </span>
          </button>
          <button
            type="button"
            disabled={savingMode || businessMode === "SALON"}
            onClick={() => void saveMode("SALON")}
            className={`settings-choice ${
              businessMode === "SALON" ? "is-selected" : ""
            }`}
          >
            <span className="settings-choice-glyph" aria-hidden>
              N
            </span>
            <span className="settings-choice-copy">
              <strong>Com equipe</strong>
              <em>Vários profissionais e serviços cruzados</em>
            </span>
          </button>
        </div>
        {businessMode === "SALON" ? (
          <p className="settings-card-note">
            Cadastre quem atende em{" "}
            <Link href="/app/profissionais">Profissionais</Link>. Logins extras
            do painel ficam em{" "}
            <Link href="/app/configuracoes?tab=equipe">Acessos</Link>.
          </p>
        ) : null}
      </section>

      <form
        onSubmit={saveInstallments}
        className="settings-card settings-card-form"
      >
        <div className="settings-card-head">
          <div>
            <p className="settings-card-kicker">Pagamentos</p>
            <h2>Parcelas no cartão</h2>
          </div>
        </div>
        <p className="settings-card-lead">
          Máximo de parcelas no cartão no agendamento e no link de pagamento.
        </p>
        <label className="settings-field">
          <span>Máximo de parcelas</span>
          <select
            className="input-field max-w-xs"
            value={cardMaxInstallments}
            onChange={(e) =>
              setCardMaxInstallments(Number(e.target.value) || 1)
            }
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 1 ? "1x — só à vista" : `Até ${n}x`}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={savingInstallments}
          className="btn-primary"
        >
          {savingInstallments ? "Salvando…" : "Salvar parcelas"}
        </button>
      </form>

      <form onSubmit={saveOrg} className="settings-card settings-card-form">
        <div className="settings-card-head">
          <div>
            <p className="settings-card-kicker">Marca</p>
            <h2>Identidade visual</h2>
          </div>
        </div>
        <p className="settings-card-lead">
          Nome, logo e cor usados no checkout, na agenda e nas declarações
          (comparecimento, atestado, receita e encaminhamento).
        </p>

        <div className="settings-identity-grid">
          <div className="settings-preview-panel">
            <p className="settings-preview-label">Prévia no checkout</p>
            <div className="settings-preview-card">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" />
              ) : (
                <div className="settings-preview-logo-fallback">Logo</div>
              )}
              <p className="settings-preview-name">{previewName}</p>
              {previewDesc ? (
                <p className="settings-preview-desc">{previewDesc}</p>
              ) : null}
              <button
                type="button"
                className="settings-preview-cta"
                style={{ background: accentColor }}
              >
                Continuar
              </button>
            </div>
          </div>

          <div className="settings-identity-fields">
            <label className="settings-field">
              <span>Nome da empresa</span>
              <input
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
              />
            </label>

            <label className="settings-field">
              <span className="settings-field-row">
                Descrição curta
                <em>
                  {description.length}/{DESCRIPTION_MAX}
                </em>
              </span>
              <textarea
                className="input-field min-h-[88px] resize-y"
                value={description}
                maxLength={DESCRIPTION_MAX}
                placeholder="Ex.: Clínica de estética e bem-estar"
                onChange={(e) =>
                  setDescription(e.target.value.slice(0, DESCRIPTION_MAX))
                }
              />
            </label>

            <div className="settings-field">
              <span>Logo</span>
              <div className="settings-logo-row">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="" />
                ) : null}
                <label className="btn-secondary cursor-pointer !py-2 text-sm">
                  Enviar arquivo
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => onLogoFile(e.target.files?.[0] || null)}
                  />
                </label>
                {logoUrl ? (
                  <button
                    type="button"
                    className="text-sm text-danger"
                    onClick={() => setLogoUrl("")}
                  >
                    Remover
                  </button>
                ) : null}
              </div>
              <p className="settings-field-hint">
                PNG, JPG ou WebP até 5 MB — otimizamos automaticamente.
              </p>
            </div>

            <label className="settings-field">
              <span>Cor principal</span>
              <div className="settings-color-row">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="settings-color-swatch"
                />
                <input
                  className="input-field font-mono text-sm uppercase"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
            </label>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Salvando…" : "Salvar identidade"}
        </button>
      </form>

      <form onSubmit={saveComms} className="settings-card settings-card-form">
        <div className="settings-card-head">
          <div>
            <p className="settings-card-kicker">Mensagens</p>
            <h2>Comunicação do agendamento</h2>
          </div>
        </div>
        <p className="settings-card-lead">
          E-mails com a identidade {brand.name} para cliente e profissional.
        </p>

        <div className="settings-comms-grid">
          <div className="settings-comms-col">
            <p className="settings-comms-title">Cliente</p>
            <ToggleRow
              label="Confirmação de agendamento"
              checked={comms.notifyClientConfirmation}
              onChange={(v) =>
                setComms((c) => ({ ...c, notifyClientConfirmation: v }))
              }
            />
            <ToggleRow
              label="Lembrete antes do atendimento"
              checked={comms.notifyClientReminder}
              onChange={(v) =>
                setComms((c) => ({ ...c, notifyClientReminder: v }))
              }
            />
            <ToggleRow
              label="Pedido de avaliação depois"
              checked={comms.notifyClientFeedback}
              onChange={(v) =>
                setComms((c) => ({ ...c, notifyClientFeedback: v }))
              }
            />
          </div>
          <div className="settings-comms-col">
            <p className="settings-comms-title">Profissional</p>
            <ToggleRow
              label="Novo agendamento confirmado"
              checked={comms.notifyProNewBooking}
              onChange={(v) =>
                setComms((c) => ({ ...c, notifyProNewBooking: v }))
              }
            />
            <ToggleRow
              label="Cancelamento"
              checked={comms.notifyProCancellation}
              onChange={(v) =>
                setComms((c) => ({ ...c, notifyProCancellation: v }))
              }
            />
            <ToggleRow
              label="Reagendamento"
              checked={comms.notifyProReschedule}
              onChange={(v) =>
                setComms((c) => ({ ...c, notifyProReschedule: v }))
              }
            />
          </div>
        </div>

        <label className="settings-field">
          <span>Lembrete antes do atendimento</span>
          <select
            className="input-field max-w-xs"
            value={comms.reminderHoursBefore}
            onChange={(e) =>
              setComms((c) => ({
                ...c,
                reminderHoursBefore: Number(e.target.value),
              }))
            }
          >
            <option value={24}>24 horas</option>
            <option value={12}>12 horas</option>
            <option value={2}>2 horas</option>
            <option value={0}>Não enviar</option>
          </select>
        </label>

        <button type="submit" disabled={savingComms} className="btn-primary">
          {savingComms ? "Salvando…" : "Salvar comunicação"}
        </button>
      </form>
    </div>
  );
}
