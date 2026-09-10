"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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

type Workflow = "liberado" | "aguardando" | "concluido" | "rascunho";

const FILTERS: { value: "" | Workflow; label: string }[] = [
  { value: "liberado", label: "Liberados" },
  { value: "aguardando", label: "Aguardando pagamento" },
  { value: "concluido", label: "Concluídos" },
  { value: "", label: "Todos" },
];

const workflowMeta: Record<
  Workflow,
  { label: string; tone: string; rank: number }
> = {
  liberado: {
    label: "Liberado",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
    rank: 0,
  },
  aguardando: {
    label: "Aguardando pagamento",
    tone: "border-amber-200 bg-amber-50 text-amber-900",
    rank: 1,
  },
  rascunho: {
    label: "Rascunho",
    tone: "border-border bg-muted-bg text-muted",
    rank: 2,
  },
  concluido: {
    label: "Concluído",
    tone: "border-slate-200 bg-slate-100 text-slate-700",
    rank: 3,
  },
};

function workflowOf(row: SubmissionRow): Workflow {
  if (row.reviewStatus === "COMPLETED") return "concluido";
  if (row.status === "PAID") return "liberado";
  if (row.status === "SUBMITTED") return "aguardando";
  return "rascunho";
}

function KpiCard({
  label,
  value,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: string;
  tone: "money" | "warn" | "ink";
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
      wrap: "border-slate-200 bg-gradient-to-br from-slate-50 to-white",
      dot: "bg-slate-600",
      value: "text-slate-900",
    },
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left shadow-sm transition ${tones.wrap} ${
        active ? "ring-2 ring-foreground/15" : "hover:shadow-md"
      }`}
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
    </button>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function StatusBadge({ row }: { row: SubmissionRow }) {
  const wf = workflowOf(row);
  const meta = workflowMeta[wf];
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.tone}`}
    >
      {meta.label}
    </span>
  );
}

export default function IntakeListPage() {
  const [allRows, setAllRows] = useState<SubmissionRow[]>([]);
  const [filter, setFilter] = useState<"" | Workflow>("liberado");
  const [q, setQ] = useState("");
  const [qDraft, setQDraft] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    fetch(`/api/checkout/intake?${params}`)
      .then((r) => r.json())
      .then((data) => setAllRows(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => setQ(qDraft.trim()), 300);
    return () => clearTimeout(t);
  }, [qDraft]);

  const counts = useMemo(() => {
    return {
      liberado: allRows.filter((r) => workflowOf(r) === "liberado").length,
      aguardando: allRows.filter((r) => workflowOf(r) === "aguardando").length,
      concluido: allRows.filter((r) => workflowOf(r) === "concluido").length,
    };
  }, [allRows]);

  const rows = useMemo(() => {
    const filtered = filter
      ? allRows.filter((r) => workflowOf(r) === filter)
      : allRows;
    return [...filtered].sort((a, b) => {
      const ra = workflowMeta[workflowOf(a)].rank;
      const rb = workflowMeta[workflowOf(b)].rank;
      if (ra !== rb) return ra - rb;
      const da = new Date(a.order.paidAt || a.createdAt).getTime();
      const db = new Date(b.order.paidAt || b.createdAt).getTime();
      return db - da;
    });
  }, [allRows, filter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pedidos de abertura</h1>
        <p className="mt-1 text-sm text-muted">
          Comece pelos liberados — já podem ser trabalhados.
        </p>
      </div>

      <CheckoutSubnav />

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          label="Liberados"
          value={String(counts.liberado)}
          tone="money"
          active={filter === "liberado"}
          onClick={() => setFilter("liberado")}
        />
        <KpiCard
          label="Aguardando pagamento"
          value={String(counts.aguardando)}
          tone="warn"
          active={filter === "aguardando"}
          onClick={() => setFilter("aguardando")}
        />
        <KpiCard
          label="Concluídos"
          value={String(counts.concluido)}
          tone="ink"
          active={filter === "concluido"}
          onClick={() => setFilter("concluido")}
        />
      </div>

      <div className="surface p-4 sm:p-5">
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
              placeholder="Buscar cliente"
              className="input-field w-full !pl-10"
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => {
              const active = filter === f.value;
              return (
                <button
                  key={f.value || "all"}
                  type="button"
                  onClick={() => setFilter(f.value)}
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
        <div className="surface px-6 py-12 text-center">
          <p className="text-sm font-semibold">Nenhum pedido aqui</p>
          <p className="mt-1 text-sm text-muted">
            {filter === "liberado"
              ? "Quando o pagamento for confirmado, o pedido aparece como liberado."
              : filter
                ? "Tente outro filtro."
                : "Ainda não há pedidos."}
          </p>
          {filter && (
            <button
              type="button"
              className="btn-secondary mt-4 text-sm"
              onClick={() => setFilter("")}
            >
              Ver todos
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {rows.map((row) => (
              <Link
                key={row.id}
                href={`/intake/${row.id}`}
                className="surface block p-4 transition hover:border-foreground/20 hover:shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted-bg text-xs font-bold tracking-wide">
                    {initials(row.order.customerName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {row.order.customerName}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {row.order.product.title}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <StatusBadge row={row} />
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
            ))}
          </div>

          <div className="surface hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
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
                  {rows.map((row) => (
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
                            <p className="truncate font-medium">
                              {row.order.customerName}
                            </p>
                            <p className="truncate text-xs text-muted">
                              {row.order.customerEmail}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="max-w-[220px] truncate">
                          {row.order.product.title}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge row={row} />
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex min-w-[2rem] items-center justify-center rounded-md border border-border bg-white px-2 py-0.5 text-xs font-semibold tabular-nums">
                          {row.attachmentCount}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-muted">
                        {format(
                          new Date(row.order.paidAt || row.createdAt),
                          "dd MMM yyyy",
                          { locale: ptBR },
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/intake/${row.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold transition hover:bg-muted-bg"
                        >
                          Abrir
                          <span aria-hidden>→</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
