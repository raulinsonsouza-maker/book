"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckoutSubnav } from "@/components/admin/CheckoutSubnav";
import {
  BOARD_STAGES,
  backLabel,
  backReviewStatus,
  boardStageOf,
  forwardLabel,
  forwardReviewStatus,
  stageMeta,
  type IntakeBoardStage,
  type ReviewStatusPatch,
} from "@/lib/intake/board-stages";

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

type ViewMode = "kanban" | "lista";

const LIST_FILTERS: { value: "" | IntakeBoardStage; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "aguardando", label: "Aguardando" },
  { value: "liberado", label: "Liberados" },
  { value: "andamento", label: "Em andamento" },
  { value: "concluido", label: "Concluídos" },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function rowDate(row: SubmissionRow) {
  return row.order.paidAt || row.createdAt;
}

function sortByDateDesc(a: SubmissionRow, b: SubmissionRow) {
  return new Date(rowDate(b)).getTime() - new Date(rowDate(a)).getTime();
}

function StatusBadge({ stage }: { stage: IntakeBoardStage }) {
  const meta = stageMeta[stage];
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.tone}`}
    >
      {meta.label}
    </span>
  );
}

function ViewToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-border bg-white p-0.5 shadow-sm">
      {(
        [
          { id: "kanban" as const, label: "Kanban" },
          { id: "lista" as const, label: "Lista" },
        ] as const
      ).map((opt) => {
        const active = mode === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              active
                ? "bg-foreground text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function KanbanCard({
  row,
  stage,
  movingId,
  onMove,
}: {
  row: SubmissionRow;
  stage: IntakeBoardStage;
  movingId: string | null;
  onMove: (id: string, next: ReviewStatusPatch) => void;
}) {
  const fwd = forwardReviewStatus(stage);
  const back = backReviewStatus(stage);
  const fwdText = forwardLabel(stage);
  const backText = backLabel(stage);
  const busy = movingId === row.id;

  return (
    <article className="rounded-xl border border-border bg-white p-3 shadow-sm transition hover:border-foreground/15 hover:shadow-md">
      <div className="flex items-start gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted-bg text-[11px] font-bold tracking-wide">
          {initials(row.order.customerName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-snug">
            {row.order.customerName}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {row.order.product.title}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted">
        <span className="inline-flex items-center rounded-md border border-border bg-muted-bg/60 px-1.5 py-0.5 font-semibold tabular-nums text-foreground">
          {row.attachmentCount} doc{row.attachmentCount === 1 ? "" : "s"}
        </span>
        <span>
          {format(new Date(rowDate(row)), "dd MMM", { locale: ptBR })}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Link
          href={`/intake/${row.id}`}
          className="inline-flex flex-1 items-center justify-center rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold transition hover:bg-muted-bg"
        >
          Abrir
        </Link>
        {back && backText && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onMove(row.id, back)}
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:bg-muted-bg hover:text-foreground disabled:opacity-50"
          >
            {busy ? "…" : backText}
          </button>
        )}
        {fwd && fwdText && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onMove(row.id, fwd)}
            className="rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "…" : fwdText}
          </button>
        )}
      </div>
    </article>
  );
}

export default function IntakeListPage() {
  const [allRows, setAllRows] = useState<SubmissionRow[]>([]);
  const [view, setView] = useState<ViewMode>("kanban");
  const [filter, setFilter] = useState<"" | IntakeBoardStage>("");
  const [q, setQ] = useState("");
  const [qDraft, setQDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);

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

  const boardRows = useMemo(
    () => allRows.filter((r) => boardStageOf(r) !== null),
    [allRows],
  );

  const counts = useMemo(() => {
    const c: Record<IntakeBoardStage, number> = {
      aguardando: 0,
      liberado: 0,
      andamento: 0,
      concluido: 0,
    };
    for (const r of boardRows) {
      const s = boardStageOf(r);
      if (s) c[s] += 1;
    }
    return c;
  }, [boardRows]);

  const byStage = useMemo(() => {
    const map: Record<IntakeBoardStage, SubmissionRow[]> = {
      aguardando: [],
      liberado: [],
      andamento: [],
      concluido: [],
    };
    for (const r of boardRows) {
      const s = boardStageOf(r);
      if (s) map[s].push(r);
    }
    for (const s of BOARD_STAGES) {
      map[s].sort(sortByDateDesc);
    }
    return map;
  }, [boardRows]);

  const listRows = useMemo(() => {
    const filtered = filter
      ? boardRows.filter((r) => boardStageOf(r) === filter)
      : boardRows;
    return [...filtered].sort((a, b) => {
      const sa = boardStageOf(a);
      const sb = boardStageOf(b);
      const ra = sa ? stageMeta[sa].rank : 99;
      const rb = sb ? stageMeta[sb].rank : 99;
      if (ra !== rb) return ra - rb;
      return sortByDateDesc(a, b);
    });
  }, [boardRows, filter]);

  async function moveStage(id: string, reviewStatus: ReviewStatusPatch) {
    setMovingId(id);
    setAllRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, reviewStatus } : r)),
    );
    try {
      const res = await fetch(`/api/checkout/intake/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus }),
      });
      if (!res.ok) load();
    } catch {
      load();
    } finally {
      setMovingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Pedidos de abertura
          </h1>
          <p className="mt-1 text-sm text-muted">
            Acompanhe o processo por etapa — do pagamento à conclusão.
          </p>
        </div>
        <ViewToggle mode={view} onChange={setView} />
      </div>

      <CheckoutSubnav />

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
          {view === "lista" && (
            <div className="flex flex-wrap gap-1.5">
              {LIST_FILTERS.map((f) => {
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
                    {f.value ? ` (${counts[f.value]})` : ""}
                  </button>
                );
              })}
            </div>
          )}
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
      ) : view === "kanban" ? (
        <div className="-mx-1 overflow-x-auto pb-2">
          <div className="flex min-w-[980px] gap-3 px-1 lg:min-w-0 lg:gap-4">
            {BOARD_STAGES.map((stage) => {
              const meta = stageMeta[stage];
              const items = byStage[stage];
              return (
                <section
                  key={stage}
                  className={`flex w-[240px] shrink-0 flex-col rounded-2xl border lg:w-auto lg:min-w-0 lg:flex-1 ${meta.column}`}
                >
                  <header className="border-b border-black/5 px-3.5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`}
                        />
                        <h2 className="truncate text-sm font-bold tracking-tight">
                          {meta.shortLabel}
                        </h2>
                      </div>
                      <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-foreground shadow-sm">
                        {items.length}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-muted">
                      {meta.hint}
                    </p>
                  </header>
                  <div className="flex max-h-[min(70vh,640px)] flex-col gap-2.5 overflow-y-auto p-2.5">
                    {items.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-border/80 bg-white/50 px-3 py-8 text-center text-xs text-muted">
                        Nenhum pedido
                      </p>
                    ) : (
                      items.map((row) => (
                        <KanbanCard
                          key={row.id}
                          row={row}
                          stage={stage}
                          movingId={movingId}
                          onMove={moveStage}
                        />
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : listRows.length === 0 ? (
        <div className="surface px-6 py-12 text-center">
          <p className="text-sm font-semibold">Nenhum pedido aqui</p>
          <p className="mt-1 text-sm text-muted">
            {filter
              ? "Tente outro filtro ou volte ao Kanban."
              : "Ainda não há pedidos enviados."}
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
            {listRows.map((row) => {
              const stage = boardStageOf(row)!;
              return (
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
                        <StatusBadge stage={stage} />
                        <span className="text-xs text-muted">
                          {row.attachmentCount} doc
                          {row.attachmentCount === 1 ? "" : "s"}
                        </span>
                        <span className="text-xs text-muted">
                          {format(new Date(rowDate(row)), "dd/MM/yy", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="surface hidden overflow-hidden md:block">
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
                      Etapa
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
                  {listRows.map((row) => {
                    const stage = boardStageOf(row)!;
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
                          <StatusBadge stage={stage} />
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex min-w-[2rem] items-center justify-center rounded-md border border-border bg-white px-2 py-0.5 text-xs font-semibold tabular-nums">
                            {row.attachmentCount}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-muted">
                          {format(new Date(rowDate(row)), "dd MMM yyyy", {
                            locale: ptBR,
                          })}
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
