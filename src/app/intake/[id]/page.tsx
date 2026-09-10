"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MARITAL_STATUS_LABELS } from "@/lib/intake/templates/company-opening-br";
import { formatIntakeAddress } from "@/lib/intake/validation/company-opening-br";
import type { CompanyOpeningBrData } from "@/lib/intake/types";
import {
  boardStageOf,
  stageMeta,
  type ReviewStatusPatch,
} from "@/lib/intake/board-stages";

type Detail = {
  id: string;
  status: string;
  reviewStatus: string;
  data: CompanyOpeningBrData | null;
  attachments: {
    id: string;
    fieldKey: string;
    label: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }[];
  order: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerCpf: string | null;
    paidAt: string | null;
    createdAt: string;
    product: { title: string; priceCents: number };
    payment: { status: string; method: string } | null;
  };
};

type Accent = "sky" | "amber" | "emerald" | "slate" | "teal" | "indigo";

const accentStyles: Record<
  Accent,
  { card: string; head: string; dot: string; icon: string; soft: string }
> = {
  sky: {
    card: "border-sky-200/80 bg-gradient-to-br from-sky-50/90 via-white to-white",
    head: "text-sky-900",
    dot: "bg-sky-500",
    icon: "bg-sky-100 text-sky-700 ring-sky-200",
    soft: "bg-sky-50/80 border-sky-100",
  },
  amber: {
    card: "border-amber-200/80 bg-gradient-to-br from-amber-50/90 via-white to-white",
    head: "text-amber-950",
    dot: "bg-amber-500",
    icon: "bg-amber-100 text-amber-800 ring-amber-200",
    soft: "bg-amber-50/80 border-amber-100",
  },
  emerald: {
    card: "border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-white to-white",
    head: "text-emerald-950",
    dot: "bg-emerald-500",
    icon: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    soft: "bg-emerald-50/80 border-emerald-100",
  },
  slate: {
    card: "border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-white",
    head: "text-slate-900",
    dot: "bg-slate-700",
    icon: "bg-slate-100 text-slate-700 ring-slate-200",
    soft: "bg-slate-50 border-slate-100",
  },
  teal: {
    card: "border-teal-200/80 bg-gradient-to-br from-teal-50/90 via-white to-white",
    head: "text-teal-950",
    dot: "bg-teal-500",
    icon: "bg-teal-100 text-teal-800 ring-teal-200",
    soft: "bg-teal-50/80 border-teal-100",
  },
  indigo: {
    card: "border-indigo-200/70 bg-gradient-to-br from-indigo-50/80 via-white to-white",
    head: "text-indigo-950",
    dot: "bg-indigo-500",
    icon: "bg-indigo-100 text-indigo-800 ring-indigo-200",
    soft: "bg-indigo-50/80 border-indigo-100",
  },
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function fileExt(name: string) {
  const i = name.lastIndexOf(".");
  if (i < 0) return "DOC";
  return name.slice(i + 1).toUpperCase().slice(0, 4) || "DOC";
}

function Field({
  label,
  children,
  mono,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-[0.07em] text-muted">
        {label}
      </dt>
      <dd
        className={`mt-1 break-words text-sm leading-snug text-foreground ${
          mono ? "font-mono text-[13px] tracking-tight" : "font-medium"
        }`}
      >
        {children || "—"}
      </dd>
    </div>
  );
}

function Panel({
  title,
  aside,
  accent,
  children,
  className = "",
}: {
  title: string;
  aside?: ReactNode;
  accent: Accent;
  children: ReactNode;
  className?: string;
}) {
  const a = accentStyles[accent];
  return (
    <section
      className={`overflow-hidden rounded-2xl border shadow-sm ${a.card} ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-black/5 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${a.dot}`} />
          <h2
            className={`text-[11px] font-bold uppercase tracking-[0.08em] ${a.head}`}
          >
            {title}
          </h2>
        </div>
        {aside}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function CopyButton({ value }: { value: string }) {
  const [ok, setOk] = useState(false);
  if (!value) return null;
  return (
    <button
      type="button"
      title={ok ? "Copiado" : "Copiar"}
      aria-label={ok ? "Copiado" : "Copiar"}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition ${
        ok
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : "border-border bg-white text-muted shadow-sm hover:border-foreground/20 hover:bg-muted-bg hover:text-foreground"
      }`}
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setOk(true);
          setTimeout(() => setOk(false), 1200);
        });
      }}
    >
      {ok ? (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V5a2 2 0 0 1 2-2h10" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

function ContactRow({
  label,
  value,
  mono,
  icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-sky-100/80 bg-white/80 px-3 py-2.5 shadow-sm">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 ring-1 ring-sky-200">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-muted">
          {label}
        </p>
        <p
          className={`truncate text-sm font-medium ${
            mono ? "font-mono text-[13px] tracking-tight" : ""
          }`}
        >
          {value || "—"}
        </p>
      </div>
      <CopyButton value={value} />
    </div>
  );
}

export default function IntakeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [msg, setMsg] = useState("");
  const [updatingReview, setUpdatingReview] = useState(false);

  useEffect(() => {
    fetch(`/api/checkout/intake/${id}`)
      .then((r) => r.json())
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [id]);

  async function setReviewStatus(reviewStatus: ReviewStatusPatch) {
    setUpdatingReview(true);
    await fetch(`/api/checkout/intake/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewStatus }),
    });
    setDetail((d) => (d ? { ...d, reviewStatus } : d));
    setUpdatingReview(false);
  }

  async function resendAlert() {
    setResending(true);
    setMsg("");
    const res = await fetch(`/api/checkout/intake/${id}?action=resend-alert`, {
      method: "POST",
    });
    setResending(false);
    setMsg(res.ok ? "E-mail de aviso reenviado." : "Não foi possível reenviar.");
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-24 animate-pulse rounded bg-white/60" />
        <div className="h-44 animate-pulse rounded-2xl bg-slate-200/70" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-48 animate-pulse rounded-2xl bg-white" />
          <div className="h-48 animate-pulse rounded-2xl bg-white" />
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="rounded-2xl border border-border bg-white px-6 py-12 text-center shadow-sm">
        <p className="text-sm font-semibold text-danger">Pedido não encontrado</p>
        <Link href="/intake" className="btn-secondary mt-4 inline-flex text-sm">
          Voltar aos pedidos
        </Link>
      </div>
    );
  }

  const data = detail.data;
  const when = detail.order.paidAt || detail.order.createdAt;
  const whenLabel = detail.order.paidAt ? "Pago" : "Criado";
  const stage = boardStageOf(detail);
  const stageInfo = stage ? stageMeta[stage] : null;
  const canManageReview = detail.status === "PAID";

  return (
    <div className="space-y-4">
      <Link
        href="/intake"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-foreground"
      >
        <span aria-hidden>←</span> Pedidos
      </Link>

      {/* Hero escuro — quebra o branco */}
      <header className="relative overflow-hidden rounded-2xl border border-slate-800/20 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white shadow-lg shadow-slate-900/10">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #34d399 0%, transparent 45%), radial-gradient(circle at 90% 10%, #38bdf8 0%, transparent 35%)",
          }}
        />
        <div className="relative p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-base font-bold tracking-wide ring-1 ring-white/20 backdrop-blur">
                {initials(detail.order.customerName)}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-200/90">
                  Pedido de abertura
                </p>
                <h1 className="mt-1 truncate text-2xl font-bold tracking-tight sm:text-[1.75rem]">
                  {detail.order.customerName}
                </h1>
                <p className="mt-1.5 text-sm text-slate-300">
                  {detail.order.product.title}
                  <span className="mx-1.5 text-white/25">·</span>
                  {whenLabel}{" "}
                  {format(new Date(when), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
              <a
                href={`/api/checkout/intake/${id}/zip`}
                className="inline-flex items-center justify-center rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-50"
              >
                Baixar ZIP
              </a>
              {detail.status === "PAID" && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-lg border border-white/25 bg-white/5 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
                  disabled={resending}
                  onClick={() => void resendAlert()}
                >
                  {resending ? "Enviando…" : "Reenviar aviso"}
                </button>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                Etapa do processo
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {stageInfo ? (
                  <span className="inline-flex rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white">
                    {stageInfo.label}
                  </span>
                ) : (
                  <span className="inline-flex rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/60">
                    Rascunho
                  </span>
                )}
              </div>
              <p className="mt-2 max-w-lg text-xs text-slate-400">
                {stageInfo?.hint ||
                  "Pedido ainda não enviado pelo cliente."}
              </p>
            </div>

            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              {canManageReview && detail.reviewStatus === "NEW" && (
                <>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-lg bg-sky-400 px-4 py-2.5 text-sm font-bold text-sky-950 shadow-sm transition hover:bg-sky-300 disabled:opacity-60"
                    disabled={updatingReview}
                    onClick={() => void setReviewStatus("IN_REVIEW")}
                  >
                    {updatingReview ? "Salvando…" : "Marcar em andamento"}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-bold text-emerald-950 shadow-sm transition hover:bg-emerald-300 disabled:opacity-60"
                    disabled={updatingReview}
                    onClick={() => void setReviewStatus("COMPLETED")}
                  >
                    {updatingReview ? "Salvando…" : "Marcar como concluída"}
                  </button>
                </>
              )}
              {canManageReview && detail.reviewStatus === "IN_REVIEW" && (
                <>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-bold text-emerald-950 shadow-sm transition hover:bg-emerald-300 disabled:opacity-60"
                    disabled={updatingReview}
                    onClick={() => void setReviewStatus("COMPLETED")}
                  >
                    {updatingReview ? "Salvando…" : "Marcar como concluída"}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-lg border border-white/25 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
                    disabled={updatingReview}
                    onClick={() => void setReviewStatus("NEW")}
                  >
                    {updatingReview ? "Salvando…" : "Voltar para liberado"}
                  </button>
                </>
              )}
              {canManageReview && detail.reviewStatus === "COMPLETED" && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-lg border border-white/25 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
                  disabled={updatingReview}
                  onClick={() => void setReviewStatus("IN_REVIEW")}
                >
                  {updatingReview ? "Salvando…" : "Reabrir (em andamento)"}
                </button>
              )}
              {msg && (
                <span className="text-xs font-medium text-emerald-200">{msg}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Contato" accent="sky">
          <div className="space-y-2.5">
            <ContactRow
              label="E-mail"
              value={detail.order.customerEmail}
              icon={
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M4 6h16v12H4z" />
                  <path d="m4 7 8 6 8-6" />
                </svg>
              }
            />
            <ContactRow
              label="Telefone"
              value={detail.order.customerPhone}
              icon={
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M6.5 3.5 9 6l-1.5 2.5a12 12 0 0 0 8 8L18 15l2.5 2.5-1.2 1.2a3 3 0 0 1-2.3.8C9.5 19 5 14.5 4.5 7a3 3 0 0 1 .8-2.3L6.5 3.5z" strokeLinejoin="round" />
                </svg>
              }
            />
            {detail.order.customerCpf && (
              <ContactRow
                label="CPF"
                value={detail.order.customerCpf}
                mono
                icon={
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <rect x="4" y="5" width="16" height="14" rx="2" />
                    <path d="M8 10h8M8 14h5" strokeLinecap="round" />
                  </svg>
                }
              />
            )}
          </div>
        </Panel>

        <Panel
          title="Documentos"
          accent="amber"
          aside={
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
              {detail.attachments.length}
            </span>
          }
        >
          {detail.attachments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/50 px-3 py-8 text-center">
              <p className="text-sm font-medium text-amber-950/70">
                Nenhum documento anexado
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {detail.attachments.map((a) => (
                <li key={a.id}>
                  <a
                    href={`/api/checkout/intake/${id}/attachments/${a.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-3 rounded-xl border border-amber-100 bg-white/90 px-3 py-2.5 shadow-sm transition hover:border-amber-300 hover:shadow"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-[10px] font-bold text-amber-900 ring-1 ring-amber-200">
                      {fileExt(a.fileName)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold group-hover:underline">
                        {a.label}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {a.fileName} · {formatBytes(a.sizeBytes)}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {!data ? (
        <Panel title="Formulário" accent="slate">
          <p className="text-sm text-muted">
            Ainda não há dados preenchidos neste pedido.
          </p>
        </Panel>
      ) : (
        <>
          <Panel
            title="Sócios"
            accent="indigo"
            aside={
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-900">
                {data.partners.length}
              </span>
            }
          >
            <div className="space-y-3">
              {data.partners.map((p, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-indigo-100 bg-white/90 p-4 shadow-sm"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-900 ring-1 ring-indigo-200">
                      {initials(p.fullName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold tracking-tight">
                        {p.fullName}
                      </p>
                      <p className="text-xs font-medium text-indigo-700/70">
                        Sócio {i + 1}
                      </p>
                    </div>
                  </div>
                  <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="CPF" mono>
                      {p.cpf}
                    </Field>
                    <Field label="Profissão">{p.profession}</Field>
                    <Field label="Estado civil">
                      {MARITAL_STATUS_LABELS[p.maritalStatus]}
                    </Field>
                    <Field label="Telefone">{p.phone}</Field>
                    <Field label="E-mail">{p.email}</Field>
                    <Field label="CEP" mono>
                      {p.zipCode}
                    </Field>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <Field label="Endereço">
                        {formatIntakeAddress(p)}
                      </Field>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Empresa" accent="slate">
              <dl className="space-y-3.5">
                <Field label="Nome fantasia">{data.tradeName || "—"}</Field>
                <Field label="Razão preferida">
                  {data.preferredLegalName || "—"}
                </Field>
                <Field label="Opções de nome">
                  {data.companyNameOptions.length ? (
                    <ul className="mt-1.5 space-y-1.5">
                      {data.companyNameOptions.map((opt, i) => (
                        <li
                          key={`${opt}-${i}`}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium"
                        >
                          {opt}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    "—"
                  )}
                </Field>
              </dl>
            </Panel>

            <Panel title="Capital e quadro" accent="emerald">
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-800/70">
                  Capital social
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-emerald-900">
                  R$ {data.shareCapitalReais}
                </p>
              </div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-900/60">
                Participação
              </p>
              <ul className="space-y-2.5">
                {data.ownership.map((o) => {
                  const name =
                    data.partners[o.partnerIndex]?.fullName ||
                    `Sócio ${o.partnerIndex + 1}`;
                  const pct = Math.max(0, Math.min(100, Number(o.percentage) || 0));
                  return (
                    <li
                      key={o.partnerIndex}
                      className="rounded-xl border border-emerald-100 bg-white/90 px-3 py-2.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-medium">
                          {name}
                        </span>
                        <span className="shrink-0 text-sm font-bold tabular-nums text-emerald-800">
                          {o.percentage}%
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-emerald-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Panel>

            <Panel title="Administração" accent="teal">
              <dl className="space-y-3.5">
                <Field label="Modo">
                  <span className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-900">
                    {data.administration.mode === "sole"
                      ? "Isolada"
                      : "Conjunta"}
                  </span>
                </Field>
                <Field label="Administrador(es)">
                  {data.administration.administratorPartnerIndices
                    .map(
                      (i) => data.partners[i]?.fullName || `Sócio ${i + 1}`,
                    )
                    .join(", ") || "—"}
                </Field>
              </dl>
            </Panel>

            <Panel title="Sede" accent="sky">
              <dl className="space-y-3.5">
                <Field label="Endereço">
                  {formatIntakeAddress(data.headquarters)}
                </Field>
                <Field label="CEP" mono>
                  {data.headquarters.zipCode}
                </Field>
              </dl>
            </Panel>
          </div>

          <Panel title="Atividades" accent="amber">
            <div className="rounded-xl border border-amber-100 bg-white/80 px-4 py-3.5">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {data.activities || "—"}
              </p>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
