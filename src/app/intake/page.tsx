"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatBRL } from "@/lib/utils";
import { CheckoutSubnav } from "@/components/admin/CheckoutSubnav";

type SubmissionRow = {
  id: string;
  status: string;
  reviewStatus: string;
  submittedAt: string | null;
  viewedAt: string | null;
  createdAt: string;
  attachmentCount: number;
  order: {
    id: string;
    status: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    paidAt: string | null;
    product: { id: string; title: string; priceCents: number };
    payment: { status: string } | null;
  };
};

const STATUS_FILTERS = [
  { value: "", label: "Todos" },
  { value: "PAID", label: "Pagos" },
  { value: "SUBMITTED", label: "Aguardando" },
  { value: "DRAFT", label: "Rascunho" },
] as const;

const statusLabel: Record<string, string> = {
  PAID: "Pagamento realizado",
  SUBMITTED: "Aguardando pagamento",
  DRAFT: "Rascunho",
};

const statusTone: Record<string, string> = {
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-800",
  SUBMITTED: "border-amber-200 bg-amber-50 text-amber-900",
  DRAFT: "border-border bg-muted-bg text-muted",
};

const reviewLabel: Record<string, string> = {
  NEW: "Novo",
  IN_REVIEW: "Novo",
  COMPLETED: "Concluído",
};

const reviewTone: Record<string, string> = {
  NEW: "border-sky-200 bg-sky-50 text-sky-900",
  IN_REVIEW: "border-sky-200 bg-sky-50 text-sky-900",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

function KpiCard({
  label,
  value,
  hint,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "money" | "warn" | "ink" | "blue";
  active?: boolean;
  onClick?: () => void;
}) {
  const tones = {
    money: {
      wrap: "border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 to-white",
      dot: "bg-emerald-500",
      value: "text-emerald-800",
    },
    warn: {
      wrap: "border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-white",
      dot: "bg-amber-500",
      value: "text-amber-900",
    },
    ink: {
      wrap: "border-border bg-gradient-to-br from-slate-50 to-white",
      dot: "bg-foreground",
      value: "text-foreground",
    },
    blue: {
      wrap: "border-blue-200/70 bg-gradient-to-br from-blue-50/80 to-white",
      dot: "bg-blue-600",
      value: "text-blue-900",
    },
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left shadow-sm transition ${tones.wrap} ${
        active ? "ring-2 ring-foreground/15" : "hover:shadow-md"
      } ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${tones.dot}`} />
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          {label}
        </p>
      </div>
      <p
        className={`mt-3 text-2xl font-bold tracking-tight tabular-nums sm:text-[1.65rem] ${tones.value}`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </button>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export default function IntakeListPage() {
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [allRows, setAllRows] = useState<SubmissionRow[]>([]);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [qDraft, setQDraft] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    fetch(`/api/checkout/intake?${params}`)
      .then((r) => r.json())
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [status, q]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/checkout/intake")
      .then((r) => r.json())
      .then((data) => setAllRows(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setQ(qDraft.trim()), 300);
    return () => clearTimeout(t);
  }, [qDraft]);

  const counts = useMemo(() => {
    const base = allRows.length ? allRows : rows;
    return {
      total: base.length,
      paid: base.filter((r) => r.status === "PAID").length,
      waiting: base.filter((r) => r.status === "SUBMITTED").length,
      draft: base.filter((r) => r.status === "DRAFT").length,
      unread: base.filter((r) => r.status === "PAID" && !r.viewedAt).length,
    };
  }, [allRows, rows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dossiês de intake</h1>
        <p className="mt-1 text-sm text-muted">
          Formulários, documentos e pedidos pagos para análise da equipe.
        </p>
      </div>

      <CheckoutSubnav />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Pagos"
          value={String(counts.paid)}
          hint={
            counts.unread > 0
              ? `${counts.unread} ainda não visualizado${counts.unread === 1 ? "" : "s"}`
              : "Prontos para análise"
          }
          tone="money"
          active={status === "PAID"}
          onClick={() => setStatus(status === "PAID" ? "" : "PAID")}
        />
        <KpiCard
          label="Aguardando"
          value={String(counts.waiting)}
          hint="Enviados, sem pagamento"
          tone="warn"
          active={status === "SUBMITTED"}
          onClick={() => setStatus(status === "SUBMITTED" ? "" : "SUBMITTED")}
        />
        <KpiCard
          label="Rascunhos"
          value={String(counts.draft)}
          hint="Preenchimento incompleto"
          tone="ink"
          active={status === "DRAFT"}
          onClick={() => setStatus(status === "DRAFT" ? "" : "DRAFT")}
        />
        <KpiCard
          label="Total"
          value={String(counts.total)}
          hint="Todos os dossiês"
          tone="blue"
          active={status === ""}
          onClick={() => setStatus("")}
        />
      </div>

      <div className="surface space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              placeholder="Buscar nome, e-mail ou telefone"
              className="input-field w-full pl-9"
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((f) => {
              const active = status === f.value;
              return (
                <button
                  key={f.value || "all"}
                  type="button"
                  onClick={() => setStatus(f.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-foreground text-white"
                      : "border border-border bg-white text-muted hover:bg-muted-bg hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="surface space-y-3 px-5 py-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-xl bg-muted-bg/80"
            />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="surface px-6 py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted-bg">
            <svg
              className="h-5 w-5 text-muted"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden
            >
              <path
                d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"
                strokeLinejoin="round"
              />
              <path d="M14 3v5h5" strokeLinejoin="round" />
              <path d="M9 13h6M9 17h4" strokeLinecap="round" />
            </svg>
          </div>
          <p className="mt-4 text-sm font-semibold">Nenhum dossiê encontrado</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            {q || status
              ? "Ajuste a busca ou o filtro de status para ver outros pedidos."
              : "Quando um cliente enviar um formulário de intake, ele aparece aqui."}
          </p>
          {(q || status) && (
            <button
              type="button"
              className="btn-secondary mt-4 text-sm"
              onClick={() => {
                setStatus("");
                setQDraft("");
                setQ("");
              }}
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {rows.map((row) => {
              const isNew = !row.viewedAt && row.status === "PAID";
              return (
                <Link
                  key={row.id}
                  href={`/intake/${row.id}`}
                  className="surface block p-4 transition hover:border-foreground/20 hover:shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted-bg text-xs font-bold tracking-wide text-foreground">
                      {initials(row.order.customerName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {row.order.customerName}
                          </p>
                          <p className="truncate text-xs text-muted">
                            {row.order.customerEmail}
                          </p>
                        </div>
                        {isNew && (
                          <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                            Novo
                          </span>
                        )}
                      </div>
                      <p className="mt-2 truncate text-sm">
                        {row.order.product.title}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                            statusTone[row.status] ||
                            "border-border bg-muted-bg text-muted"
                          }`}
                        >
                          {statusLabel[row.status] || row.status}
                        </span>
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                            reviewTone[row.reviewStatus] ||
                            "border-border bg-muted-bg text-muted"
                          }`}
                        >
                          {reviewLabel[row.reviewStatus] || row.reviewStatus}
                        </span>
                        <span className="text-xs text-muted">
                          {row.attachmentCount} doc
                          {row.attachmentCount === 1 ? "" : "s"}
                        </span>
                        <span className="text-xs text-muted">
                          {format(
                            new Date(row.order.paidAt || row.createdAt),
                            "dd/MM/yy",
                            { locale: ptBR },
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="surface hidden overflow-hidden md:block">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">
                  Pedidos
                </h2>
                <p className="text-xs text-muted">
                  {rows.length} dossiê{rows.length === 1 ? "" : "s"}
                  {status || q ? " no filtro atual" : ""}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-border bg-muted-bg/70 text-muted">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                      Produto
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                      Docs
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                      Data
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => {
                    const isNew = !row.viewedAt && row.status === "PAID";
                    return (
                      <tr
                        key={row.id}
                        className="transition hover:bg-muted-bg/40"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted-bg text-[11px] font-bold tracking-wide">
                              {initials(row.order.customerName)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="truncate font-medium">
                                  {row.order.customerName}
                                </p>
                                {isNew && (
                                  <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                                    Novo
                                  </span>
                                )}
                              </div>
                              <p className="truncate text-xs text-muted">
                                {row.order.customerEmail}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="max-w-[220px] truncate font-medium">
                            {row.order.product.title}
                          </p>
                          <p className="mt-0.5 text-xs tabular-nums text-muted">
                            {formatBRL(row.order.product.priceCents)}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col items-start gap-1.5">
                            <span
                              className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                                statusTone[row.status] ||
                                "border-border bg-muted-bg text-muted"
                              }`}
                            >
                              {statusLabel[row.status] || row.status}
                            </span>
                            <span
                              className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                                reviewTone[row.reviewStatus] ||
                                "border-border bg-muted-bg text-muted"
                              }`}
                            >
                              {reviewLabel[row.reviewStatus] || row.reviewStatus}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex min-w-[2rem] items-center justify-center rounded-md border border-border bg-white px-2 py-0.5 text-xs font-semibold tabular-nums">
                            {row.attachmentCount}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-muted">
                          {format(
                            new Date(row.order.paidAt || row.createdAt),
                            "dd MMM yyyy · HH:mm",
                            { locale: ptBR },
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Link
                            href={`/intake/${row.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold transition hover:bg-muted-bg"
                          >
                            Ver dossiê
                            <span aria-hidden>→</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
