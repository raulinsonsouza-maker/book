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

function StepBadge({
  n,
  done,
  label,
}: {
  n: number;
  done: boolean;
  label: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
        done
          ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
          : "bg-muted-bg text-muted ring-1 ring-border"
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
          done ? "bg-emerald-600 text-white" : "bg-white text-muted"
        }`}
      >
        {done ? "✓" : n}
      </span>
      {label}
    </div>
  );
}

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
  const [svcForm, setSvcForm] = useState({
    title: "",
    description: "",
    durationMinutes: "30",
    priceMasked: "R$\u00a0390,00",
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
    setPage(await res.json());
  }

  useEffect(() => {
    load();
    fetch("/api/organization")
      .then((r) => r.json())
      .then((data) => {
        setPaymentProvider(data.paymentProvider || "CAKTO");
        setOrgSlug(data.slug || "");
      });
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
  const doneCount = [checklist.name, checklist.services, checklist.hours].filter(
    Boolean,
  ).length;

  async function saveMeta(e?: React.FormEvent) {
    e?.preventDefault();
    if (!page) return;
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
      return;
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
    setMsg("Dados salvos");
    setTimeout(() => setMsg(""), 2000);
  }

  async function addService(e: React.FormEvent) {
    e.preventDefault();
    if (!page) return;
    const duration = Math.max(5, parseInt(svcForm.durationMinutes || "0", 10) || 0);
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
        customFields: [
          {
            label: "Conte brevemente sua situação",
            type: "TEXTAREA",
            required: true,
          },
        ],
      }),
    });
    setSvcForm({
      title: "",
      description: "",
      durationMinutes: "30",
      priceMasked: "R$\u00a0390,00",
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

  if (!page) {
    return <p className="text-sm text-muted">Carregando…</p>;
  }

  const publicUrl = orgSlug
    ? bookingPublicUrl(orgSlug, page.slug)
    : `${appUrl}/p/${page.slug}`;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/app/pages" className="text-sm text-muted hover:text-foreground">
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

      {msg && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {msg}
        </p>
      )}

      {/* Overview */}
      <section className="surface space-y-4 p-5">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{page.title}</h1>
          <p className="mt-1 text-sm text-muted">
            Configure em 3 passos. Quando tudo estiver marcado, copie o link e
            envie ao cliente. A personalização do funil fica abaixo.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <StepBadge n={1} done={checklist.services} label="Serviços" />
          <StepBadge n={2} done={checklist.hours} label="Horários" />
          <StepBadge n={3} done={checklist.name} label="Apresentação" />
        </div>

        <p className="text-xs text-muted">{doneCount}/3 concluídos</p>

        {ready ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
            <p className="text-sm font-semibold text-emerald-900">
              Agenda pronta para receber clientes
            </p>
            <p className="mt-1 break-all font-mono text-xs text-emerald-800/90">
              {publicUrl}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <CopyLinkButton url={publicUrl} />
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-primary !py-1.5 !text-xs"
              >
                Abrir como cliente
              </a>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-muted-bg/50 px-4 py-3 text-sm text-muted">
            Falta{" "}
            {[
              !checklist.services && "adicionar um serviço",
              !checklist.hours && "definir horários",
              !checklist.name && "confirmar o nome",
            ]
              .filter(Boolean)
              .join(", ")
              .replace(/, ([^,]*)$/, " e $1")}
            .
          </div>
        )}
      </section>

      {/* Step 1 — Services */}
      <section className="surface space-y-4 p-5">
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              checklist.services
                ? "bg-emerald-600 text-white"
                : "bg-foreground text-white"
            }`}
          >
            {checklist.services ? "✓" : "1"}
          </span>
          <div>
            <h2 className="font-semibold tracking-tight">O que você oferece</h2>
            <p className="mt-0.5 text-sm text-muted">
              Serviços que o cliente escolhe ao agendar (nome, duração e preço).
            </p>
          </div>
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
                      updateService(svc, { isActive: !svc.isActive })
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
                        updateService(svc, {
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
          onSubmit={addService}
          className="space-y-3 rounded-xl border border-dashed border-border bg-muted-bg/30 p-4"
        >
          <p className="text-sm font-medium">
            {page.services.length === 0 ? "Adicione o primeiro serviço" : "Novo serviço"}
          </p>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Nome</span>
            <input
              required
              placeholder="Ex.: Consultoria estratégica"
              className="input-field"
              value={svcForm.title}
              onChange={(e) => setSvcForm({ ...svcForm, title: e.target.value })}
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
              Descrição <span className="font-normal text-muted">(opcional)</span>
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
          <button type="submit" disabled={addingService} className="btn-primary">
            {addingService ? "Adicionando…" : "Adicionar serviço"}
          </button>
        </form>
      </section>

      {/* Step 2 — Hours */}
      <section className="surface space-y-4 p-5">
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              checklist.hours
                ? "bg-emerald-600 text-white"
                : "bg-foreground text-white"
            }`}
          >
            {checklist.hours ? "✓" : "2"}
          </span>
          <div>
            <h2 className="font-semibold tracking-tight">Quando você atende</h2>
            <p className="mt-0.5 text-sm text-muted">
              Marque os dias e o horário de funcionamento. O cliente só vê
              horários livres nesses períodos.
            </p>
          </div>
        </div>

        <WeekHoursSimple
          pageId={page.id}
          initialRules={page.availability || []}
          onSaved={(rules) =>
            setPage((p) => (p ? { ...p, availability: rules } : p))
          }
        />

        <p className="text-xs text-muted">
          Precisa bloquear um feriado ou ver o preview detalhado?{" "}
          <Link
            href={`/app/pages/${page.id}/availability`}
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            Opções avançadas
          </Link>
        </p>
      </section>

      {/* Step 3 — Presentation */}
      <section className="surface space-y-4 p-5">
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              checklist.name
                ? "bg-emerald-600 text-white"
                : "bg-foreground text-white"
            }`}
          >
            {checklist.name ? "✓" : "3"}
          </span>
          <div>
            <h2 className="font-semibold tracking-tight">Como aparece no link</h2>
            <p className="mt-0.5 text-sm text-muted">
              Nome e texto que o cliente vê no topo do agendamento. Logo e cores
              da empresa ficam em Conta → Identidade visual.
            </p>
          </div>
        </div>

        <form onSubmit={saveMeta} className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Nome da agenda</span>
            <input
              required
              minLength={2}
              className="input-field"
              value={page.title}
              onChange={(e) => setPage({ ...page, title: e.target.value })}
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
          <button type="submit" disabled={savingMeta} className="btn-primary">
            {savingMeta ? "Salvando…" : "Salvar apresentação"}
          </button>
        </form>

      </section>

      {/* Personalização do funil */}
      <section id="personalizar" className="surface space-y-4 overflow-hidden p-0">
        <div className="space-y-1 border-b border-border px-5 py-4">
          <h2 className="font-semibold tracking-tight">Personalizar funil</h2>
          <p className="text-sm text-muted">
            Blocos, campos do formulário e visual que o cliente vê ao agendar.
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
          <p className="px-5 pb-5 text-sm text-muted">Carregando construtor…</p>
        )}
      </section>
    </div>
  );
}
