"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { DeletePageButton } from "@/components/admin/DeletePageButton";
import { WeekHoursSimple } from "@/components/availability/WeekHoursSimple";
import { PageBuilder } from "@/components/builder/PageBuilder";
import { bookingPublicUrl } from "@/lib/booking-page-slug";
import {
  formatBRL,
  maskBRLFromDigits,
  maskMinutes,
  parseBRLMaskToCents,
} from "@/lib/utils";
import { CAKTO_ENABLED } from "@/lib/feature-flags";

type CustomField = {
  id?: string;
  label: string;
  type: string;
  required: boolean;
};

type Service = {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  caktoOfferId: string | null;
  isActive: boolean;
  customFields: CustomField[];
};

type Rule = { dayOfWeek: number; startTime: string; endTime: string };

type PageData = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  accentColor: string;
  websiteUrl: string | null;
  instagram: string | null;
  timezone: string;
  isActive: boolean;
  services: Service[];
  availability: Rule[];
  _count?: { bookings: number };
};

type WizardStep = "name" | "services" | "hours" | "done";

const STEPS: { id: WizardStep; label: string }[] = [
  { id: "name", label: "Nome" },
  { id: "services", label: "Serviços" },
  { id: "hours", label: "Horários" },
  { id: "done", label: "Pronto" },
];

const PRESET_WEEKDAYS: Rule[] = [1, 2, 3, 4, 5].flatMap((dayOfWeek) => [
  { dayOfWeek, startTime: "09:00", endTime: "12:00" },
  { dayOfWeek, startTime: "13:00", endTime: "18:00" },
]);

export default function PageEditor() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [page, setPage] = useState<PageData | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<
    "CAKTO" | "MERCADO_PAGO" | "ASAAS"
  >("CAKTO");
  const [orgSlug, setOrgSlug] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [msg, setMsg] = useState("");
  const [addingService, setAddingService] = useState(false);
  const [step, setStep] = useState<WizardStep | null>(null);
  const [svcForm, setSvcForm] = useState({
    title: "",
    description: "",
    durationMinutes: "60",
    priceMasked: "R$\u00a0150,00",
  });

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "";

  async function load() {
    const res = await fetch(`/api/pages/${id}`);
    if (!res.ok) {
      router.push("/app/pages");
      return;
    }
    const data = (await res.json()) as PageData;
    setPage(data);
    setStep((prev) => prev ?? initialStep(data));
  }

  useEffect(() => {
    void load();
    fetch("/api/organization")
      .then((r) => r.json())
      .then((data) => {
        setPaymentProvider(data.paymentProvider || "CAKTO");
        setOrgSlug(data.slug || "");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const checklist = useMemo(() => {
    if (!page) return { name: false, services: false, hours: false };
    return {
      name: page.title.trim().length >= 2,
      services: page.services.some((s) => s.isActive),
      hours: (page.availability || []).length > 0,
    };
  }, [page]);

  const ready =
    checklist.name && checklist.services && checklist.hours;

  async function saveMeta() {
    if (!page) return false;
    setSavingMeta(true);
    const res = await fetch(`/api/pages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: page.title,
        description: page.description,
      }),
    });
    setSavingMeta(false);
    if (!res.ok) {
      setMsg("Não foi possível salvar");
      return false;
    }
    const updated = await res.json();
    setPage((p) =>
      p
        ? {
            ...p,
            title: updated.title,
            slug: updated.slug,
            description: updated.description,
          }
        : p,
    );
    return true;
  }

  async function addService(e: React.FormEvent) {
    e.preventDefault();
    if (!page) return;
    const duration = Math.max(
      5,
      parseInt(svcForm.durationMinutes || "0", 10) || 0,
    );
    const priceCents = parseBRLMaskToCents(svcForm.priceMasked);
    if (!duration || !svcForm.title.trim()) return;
    setAddingService(true);
    await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingPageId: page.id,
        title: svcForm.title.trim(),
        description: svcForm.description.trim() || null,
        durationMinutes: duration,
        priceCents,
        customFields: [],
      }),
    });
    setSvcForm({
      title: "",
      description: "",
      durationMinutes: "60",
      priceMasked: "R$\u00a0150,00",
    });
    setAddingService(false);
    await load();
    setMsg("Serviço adicionado");
    setTimeout(() => setMsg(""), 2000);
  }

  async function updateService(svc: Service, patch: Partial<Service>) {
    await fetch(`/api/services/${svc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await load();
  }

  async function applyHoursPreset() {
    const res = await fetch("/api/availability", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId: id, rules: PRESET_WEEKDAYS }),
    });
    if (!res.ok) {
      setMsg("Não foi possível aplicar o modelo");
      return;
    }
    setPage((p) => (p ? { ...p, availability: PRESET_WEEKDAYS } : p));
    setMsg("Horário comercial aplicado — você pode ajustar abaixo");
    setTimeout(() => setMsg(""), 2500);
  }

  if (!page || !step) {
    return <p className="text-sm text-muted">Carregando…</p>;
  }

  const publicUrl = orgSlug
    ? bookingPublicUrl(orgSlug, page.slug)
    : `${appUrl}/p/${page.slug}`;

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  async function goNextFromName() {
    if (!page || page.title.trim().length < 2) {
      setMsg("Informe um nome com pelo menos 2 caracteres");
      return;
    }
    const ok = await saveMeta();
    if (ok) setStep("services");
  }

  function goNextFromServices() {
    if (!checklist.services) {
      setMsg("Adicione pelo menos um serviço ativo para continuar");
      return;
    }
    setMsg("");
    setStep("hours");
  }

  function goNextFromHours() {
    if (!checklist.hours) {
      setMsg("Defina e salve pelo menos um dia de atendimento");
      return;
    }
    setMsg("");
    setStep("done");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/app/pages"
          className="text-sm text-muted hover:text-foreground"
        >
          ← Agendas
        </Link>
        <DeletePageButton
          pageId={page.id}
          pageTitle={page.title}
          bookingsCount={page._count?.bookings ?? 0}
          isActive={page.isActive}
          redirectTo="/app/pages"
        />
      </div>

      {/* Progress */}
      <div className="surface space-y-4 p-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            Configurar agenda
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">
            {page.title || "Nova agenda"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Um passo de cada vez. Horários só liberam depois que você definir.
          </p>
        </div>
        <ol className="flex flex-wrap gap-2">
          {STEPS.map((s, i) => {
            const active = s.id === step;
            const past = i < stepIndex;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (past || active) setStep(s.id);
                  }}
                  disabled={!past && !active && !(ready && s.id === "done")}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-foreground text-white"
                      : past || (ready && s.id === "done")
                        ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                        : "bg-muted-bg text-muted ring-1 ring-border"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                      active
                        ? "bg-white/20 text-white"
                        : past || (ready && s.id === "done")
                          ? "bg-emerald-600 text-white"
                          : "bg-white text-muted"
                    }`}
                  >
                    {past || (ready && s.id === "done" && !active) ? "✓" : i + 1}
                  </span>
                  {s.label}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {msg && (
        <p className="rounded-lg border border-border bg-muted-bg px-4 py-2 text-sm">
          {msg}
        </p>
      )}

      {/* Step: name */}
      {step === "name" && (
        <section className="surface space-y-4 p-5 animate-in">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Como o cliente vê esta agenda?
            </h2>
            <p className="mt-1 text-sm text-muted">
              Nome e texto no topo do link público. Logo e cores ficam em Conta.
            </p>
          </div>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Nome da agenda</span>
            <input
              required
              minLength={2}
              className="input-field"
              value={page.title}
              onChange={(e) => setPage({ ...page, title: e.target.value })}
              placeholder="Ex.: Consultoria estratégica"
              autoFocus
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">
              Texto de apoio{" "}
              <span className="font-normal text-muted">(opcional)</span>
            </span>
            <textarea
              rows={3}
              className="input-field"
              placeholder="Ex.: Atendimento online e presencial"
              value={page.description || ""}
              onChange={(e) =>
                setPage({ ...page, description: e.target.value })
              }
            />
          </label>
          <button
            type="button"
            disabled={savingMeta}
            onClick={() => void goNextFromName()}
            className="btn-primary w-full sm:w-auto"
          >
            {savingMeta ? "Salvando…" : "Continuar"}
          </button>
        </section>
      )}

      {/* Step: services */}
      {step === "services" && (
        <section className="surface space-y-4 p-5 animate-in">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              O que você oferece?
            </h2>
            <p className="mt-1 text-sm text-muted">
              Cada serviço tem duração e preço. O cliente escolhe um ao agendar.
            </p>
          </div>

          {page.services.length > 0 && (
            <ul className="space-y-2">
              {page.services.map((svc) => (
                <li
                  key={svc.id}
                  className={`rounded-xl border px-4 py-3 ${
                    svc.isActive
                      ? "border-border bg-white"
                      : "border-border bg-muted-bg/50 opacity-70"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium tracking-tight">{svc.title}</p>
                      <p className="mt-0.5 text-sm text-muted">
                        {svc.durationMinutes} min · {formatBRL(svc.priceCents)}
                        {!svc.isActive && " · inativo"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        void updateService(svc, { isActive: !svc.isActive })
                      }
                      className="text-xs font-semibold text-muted hover:text-foreground"
                    >
                      {svc.isActive ? "Desativar" : "Ativar"}
                    </button>
                  </div>
                  {CAKTO_ENABLED && paymentProvider === "CAKTO" && (
                    <label className="mt-3 block text-xs">
                      <span className="mb-1 block text-muted">
                        Oferta Cakto (opcional)
                      </span>
                      <input
                        className="input-field text-sm"
                        defaultValue={svc.caktoOfferId || ""}
                        placeholder="Vazio = oferta padrão da integração"
                        onBlur={(e) =>
                          void updateService(svc, {
                            caktoOfferId: e.target.value || null,
                          } as Partial<Service>)
                        }
                      />
                    </label>
                  )}
                </li>
              ))}
            </ul>
          )}

          <form
            onSubmit={(e) => void addService(e)}
            className="space-y-3 rounded-xl border border-dashed border-border bg-muted-bg/30 p-4"
          >
            <p className="text-sm font-medium">
              {page.services.length === 0
                ? "Adicione o primeiro serviço"
                : "Novo serviço"}
            </p>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Nome</span>
              <input
                required
                placeholder="Ex.: Corte feminino"
                className="input-field"
                value={svcForm.title}
                onChange={(e) =>
                  setSvcForm({ ...svcForm, title: e.target.value })
                }
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">Duração (min)</span>
                <input
                  required
                  inputMode="numeric"
                  className="input-field"
                  value={svcForm.durationMinutes}
                  onChange={(e) =>
                    setSvcForm({
                      ...svcForm,
                      durationMinutes: maskMinutes(e.target.value),
                    })
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">Preço</span>
                <input
                  required
                  inputMode="numeric"
                  className="input-field"
                  value={svcForm.priceMasked}
                  onChange={(e) =>
                    setSvcForm({
                      ...svcForm,
                      priceMasked: maskBRLFromDigits(e.target.value),
                    })
                  }
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">
                Descrição{" "}
                <span className="font-normal text-muted">(opcional)</span>
              </span>
              <textarea
                placeholder="O que está incluso"
                className="input-field"
                rows={2}
                value={svcForm.description}
                onChange={(e) =>
                  setSvcForm({ ...svcForm, description: e.target.value })
                }
              />
            </label>
            <button
              type="submit"
              disabled={addingService}
              className="btn-secondary"
            >
              {addingService ? "Adicionando…" : "Adicionar serviço"}
            </button>
          </form>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => setStep("name")}
              className="btn-secondary"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={goNextFromServices}
              className="btn-primary"
            >
              Continuar
            </button>
          </div>
        </section>
      )}

      {/* Step: hours */}
      {step === "hours" && (
        <section className="surface space-y-4 p-5 animate-in">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Quando você atende?
            </h2>
            <p className="mt-1 text-sm text-muted">
              Sem horários salvos, o link não mostra vagas. Escolha os dias e
              salve.
            </p>
          </div>

          {(page.availability || []).length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-muted-bg/40 p-4">
              <p className="text-sm font-medium">Começar mais rápido</p>
              <p className="mt-1 text-xs text-muted">
                Modelo seg–sex, 9h–12h e 13h–18h. Você pode editar depois.
              </p>
              <button
                type="button"
                onClick={() => void applyHoursPreset()}
                className="btn-secondary mt-3 !text-xs"
              >
                Usar horário comercial
              </button>
            </div>
          )}

          <WeekHoursSimple
            pageId={page.id}
            initialRules={page.availability || []}
            onSaved={(rules) =>
              setPage((p) => (p ? { ...p, availability: rules } : p))
            }
          />

          <p className="text-xs text-muted">
            Feriados e exceções?{" "}
            <Link
              href={`/app/pages/${page.id}/availability`}
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              Opções avançadas
            </Link>
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => setStep("services")}
              className="btn-secondary"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={goNextFromHours}
              className="btn-primary"
            >
              Continuar
            </button>
          </div>
        </section>
      )}

      {/* Step: done */}
      {step === "done" && (
        <section className="space-y-5 animate-in">
          <div className="surface space-y-4 p-5">
            {ready ? (
              <>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-emerald-900">
                    Agenda pronta
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Copie o link e envie ao cliente. Você pode personalizar o
                    funil abaixo.
                  </p>
                </div>
                <p className="break-all rounded-xl bg-muted-bg px-3 py-2 font-mono text-xs">
                  {publicUrl}
                </p>
                <div className="flex flex-wrap gap-2">
                  <CopyLinkButton url={publicUrl} />
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary !py-1.5 !text-xs"
                  >
                    Abrir como cliente
                  </a>
                  <Link href="/app" className="btn-secondary !py-1.5 !text-xs">
                    Ir ao painel
                  </Link>
                </div>
              </>
            ) : (
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Quase lá
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Ainda falta completar os passos anteriores.
                </p>
                <button
                  type="button"
                  className="btn-primary mt-4"
                  onClick={() =>
                    setStep(
                      !checklist.name
                        ? "name"
                        : !checklist.services
                          ? "services"
                          : "hours",
                    )
                  }
                >
                  Continuar configuração
                </button>
              </div>
            )}
          </div>

          {ready && (
            <section
              id="personalizar"
              className="surface space-y-4 overflow-hidden p-0"
            >
              <div className="space-y-1 border-b border-border px-5 py-4">
                <h2 className="font-semibold tracking-tight">
                  Personalizar funil
                </h2>
                <p className="text-sm text-muted">
                  Opcional — blocos, campos e visual do agendamento.
                </p>
              </div>
              {orgSlug ? (
                <PageBuilder
                  pageId={page.id}
                  orgSlug={orgSlug}
                  pageSlug={page.slug}
                  embedded
                />
              ) : (
                <p className="px-5 pb-5 text-sm text-muted">
                  Carregando construtor…
                </p>
              )}
            </section>
          )}

          <button
            type="button"
            onClick={() => setStep("hours")}
            className="text-sm font-medium text-muted hover:text-foreground"
          >
            ← Voltar aos horários
          </button>
        </section>
      )}
    </div>
  );
}

function initialStep(page: PageData): WizardStep {
  const hasName = page.title.trim().length >= 2;
  const hasServices = page.services.some((s) => s.isActive);
  const hasHours = (page.availability || []).length > 0;
  if (hasName && hasServices && hasHours) return "done";
  if (!hasName) return "name";
  if (!hasServices) return "services";
  if (!hasHours) return "hours";
  return "done";
}
