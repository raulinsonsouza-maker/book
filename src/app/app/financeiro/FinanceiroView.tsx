"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatBRL } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  FinanceiroCharts,
  type FinanceSeries,
} from "@/components/admin/FinanceiroCharts";

type PageOption = { id: string; title: string };

type PaymentRow = {
  id: string;
  type: "booking" | "checkout";
  status: string;
  method: string;
  amountCents: number;
  commissionCents?: number;
  paidAt: string | null;
  createdAt: string;
  booking?: {
    id: string;
    customerName: string;
    customerEmail: string;
    startAt: string;
    serviceTitle: string;
    pageTitle: string;
    professionalName?: string | null;
    commissionPercent?: number | null;
  };
  checkout?: {
    id: string;
    customerName: string;
    customerEmail: string;
    productTitle: string;
  };
};

type Summary = {
  receitas: number;
  pendente: number;
  confirmados: number;
  ticketMedio: number;
  comissaoTotal?: number;
  liquidoSalao?: number;
};

const statusLabel: Record<string, string> = {
  PAID: "Pago",
  PENDING: "Pendente",
  FAILED: "Falhou",
  REFUNDED: "Estornado",
};

const statusTone: Record<string, string> = {
  PAID: "bg-emerald-50 text-emerald-800 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-800 border-amber-200",
  FAILED: "bg-red-50 text-red-800 border-red-200",
  REFUNDED: "bg-muted-bg text-muted border-border",
};

type Props = {
  isProfessionalView?: boolean;
};

function KpiCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "money" | "warn" | "ink" | "blue";
}) {
  const tones = {
    money: {
      wrap: "border-border bg-white",
      value: "text-foreground",
    },
    warn: {
      wrap: "border-border bg-white",
      value: "text-foreground",
    },
    ink: {
      wrap: "border-border bg-white",
      value: "text-foreground",
    },
    blue: {
      wrap: "border-border bg-white",
      value: "text-foreground",
    },
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones.wrap}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-bold tracking-tight tabular-nums sm:text-[1.65rem] ${tones.value}`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function FinanceiroView({ isProfessionalView = false }: Props) {
  const [from, setFrom] = useState(() =>
    format(subDays(new Date(), 30), "yyyy-MM-dd"),
  );
  const [to, setTo] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [pageId, setPageId] = useState("");
  const [type, setType] = useState("");
  const [pages, setPages] = useState<PageOption[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [series, setSeries] = useState<FinanceSeries | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [customRange, setCustomRange] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const rangeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isProfessionalView) return;
    fetch("/api/pages")
      .then((r) => r.json())
      .then((data) => setPages(Array.isArray(data) ? data : []));
  }, [isProfessionalView]);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ from, to });
    if (status) params.set("status", status);
    if (method) params.set("method", method);
    if (!isProfessionalView && pageId) params.set("bookingPageId", pageId);
    if (!isProfessionalView && type) params.set("type", type);
    fetch(`/api/financeiro?${params}`)
      .then(async (r) => {
        let data: { error?: string; summary?: typeof summary; series?: typeof series; payments?: PaymentRow[] } = {};
        try {
          data = await r.json();
        } catch {
          setError(
            r.ok
              ? "Resposta inválida do servidor"
              : `Erro ao carregar o financeiro (${r.status})`,
          );
          setSummary(null);
          setSeries(null);
          setPayments([]);
          return;
        }
        if (!r.ok) {
          setError(data.error || "Não foi possível carregar o financeiro");
          setSummary(null);
          setSeries(null);
          setPayments([]);
          return;
        }
        setSummary(data.summary ?? null);
        setSeries(data.series || null);
        setPayments(data.payments || []);
      })
      .catch(() => {
        setError("Falha de rede ao carregar o financeiro");
        setSummary(null);
        setSeries(null);
        setPayments([]);
      })
      .finally(() => setLoading(false));
  }, [from, to, status, method, pageId, type, isProfessionalView]);

  useEffect(() => {
    load();
  }, [load]);

  function exportCsv() {
    const params = new URLSearchParams({ from, to });
    if (status) params.set("status", status);
    if (method) params.set("method", method);
    if (!isProfessionalView && pageId) params.set("bookingPageId", pageId);
    if (!isProfessionalView && type) params.set("type", type);
    window.location.href = `/api/financeiro/export?${params}`;
  }

  function setPreset(days: number) {
    setCustomRange(false);
    setTo(format(new Date(), "yyyy-MM-dd"));
    setFrom(format(subDays(new Date(), days), "yyyy-MM-dd"));
    setRangeOpen(false);
  }

  function setThisMonth() {
    const now = new Date();
    setCustomRange(false);
    setFrom(format(startOfMonth(now), "yyyy-MM-dd"));
    setTo(format(endOfMonth(now), "yyyy-MM-dd"));
    setRangeOpen(false);
  }

  function activePreset(): 7 | 30 | 90 | "month" | null {
    if (customRange) return null;
    const now = new Date();
    if (
      from === format(startOfMonth(now), "yyyy-MM-dd") &&
      to === format(endOfMonth(now), "yyyy-MM-dd")
    ) {
      return "month";
    }
    const today = format(now, "yyyy-MM-dd");
    if (to !== today) return null;
    for (const days of [7, 30, 90] as const) {
      if (from === format(subDays(now, days), "yyyy-MM-dd")) return days;
    }
    return null;
  }

  useEffect(() => {
    if (!rangeOpen) return;
    function onDoc(e: MouseEvent) {
      if (!rangeRef.current?.contains(e.target as Node)) setRangeOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [rangeOpen]);

  const hasFilters = Boolean(status || method || type || pageId);
  const preset = activePreset();
  const rangeLabel = useMemo(() => {
    try {
      const a = format(parseISO(from), "d MMM yyyy", { locale: ptBR });
      const b = format(parseISO(to), "d MMM yyyy", { locale: ptBR });
      return `${a} – ${b}`;
    } catch {
      return `${from} – ${to}`;
    }
  }, [from, to]);
  const presetLabel =
    preset === 7
      ? "Últimos 7 dias"
      : preset === 30
        ? "Últimos 30 dias"
        : preset === 90
          ? "Últimos 90 dias"
          : preset === "month"
            ? "Este mês"
            : "Personalizado";

  return (
    <div className="space-y-6">
      <AdminPageHeader>
        Acompanhe receitas, pendências e o histórico de pagamentos da conta.
      </AdminPageHeader>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="surface relative z-0 overflow-visible">
        <div className="relative z-20 flex flex-wrap items-center gap-2 rounded-t-[inherit] border-b border-border bg-muted-bg/50 px-3 py-2.5 sm:px-4">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              filtersOpen || hasFilters
                ? "border-foreground/20 bg-white text-foreground shadow-sm"
                : "border-border bg-white text-foreground hover:bg-muted-bg"
            }`}
          >
            Filtros
            {hasFilters
              ? ` · ${[status, method, type, pageId].filter(Boolean).length}`
              : ""}
          </button>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <div className="relative z-30" ref={rangeRef}>
              <button
                type="button"
                onClick={() => setRangeOpen((v) => !v)}
                className="inline-flex max-w-full items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted-bg"
                aria-expanded={rangeOpen}
                aria-haspopup="listbox"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M3 10h18M8 3v4M16 3v4" />
                </svg>
                <span className="max-w-[14rem] truncate sm:max-w-[18rem]">
                  <span className="text-muted">{presetLabel}: </span>
                  {rangeLabel}
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className={`shrink-0 opacity-60 transition ${rangeOpen ? "rotate-180" : ""}`}
                  aria-hidden
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {rangeOpen ? (
                <div
                  role="listbox"
                  className="absolute right-0 top-full z-50 mt-1.5 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-border bg-white shadow-lg shadow-black/10"
                >
                  <div className="border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Período
                  </div>
                  <div className="p-1.5">
                    {(
                      [
                        { id: 7 as const, label: "Últimos 7 dias" },
                        { id: 30 as const, label: "Últimos 30 dias" },
                        { id: 90 as const, label: "Últimos 90 dias" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        role="option"
                        aria-selected={preset === opt.id}
                        onClick={() => setPreset(opt.id)}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                          preset === opt.id
                            ? "bg-muted-bg font-semibold text-foreground"
                            : "text-foreground hover:bg-muted-bg"
                        }`}
                      >
                        {opt.label}
                        {preset === opt.id ? <span>✓</span> : null}
                      </button>
                    ))}
                    <button
                      type="button"
                      role="option"
                      aria-selected={preset === "month"}
                      onClick={setThisMonth}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                        preset === "month"
                          ? "bg-muted-bg font-semibold text-foreground"
                          : "text-foreground hover:bg-muted-bg"
                      }`}
                    >
                      Este mês
                      {preset === "month" ? <span>✓</span> : null}
                    </button>
                    <button
                      type="button"
                      role="option"
                      aria-selected={preset === null}
                      onClick={() => setCustomRange(true)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                        preset === null
                          ? "bg-muted-bg font-semibold text-foreground"
                          : "text-foreground hover:bg-muted-bg"
                      }`}
                    >
                      Personalizado
                      {preset === null ? <span>✓</span> : null}
                    </button>
                  </div>
                  {customRange || preset === null ? (
                    <div className="grid grid-cols-2 gap-2 border-t border-border bg-muted-bg/60 p-3">
                      <label className="block text-xs">
                        <span className="mb-1 block font-medium text-muted">
                          De
                        </span>
                        <input
                          type="date"
                          className="input-field !py-1.5 text-sm"
                          value={from}
                          onChange={(e) => {
                            setCustomRange(true);
                            setFrom(e.target.value);
                          }}
                        />
                      </label>
                      <label className="block text-xs">
                        <span className="mb-1 block font-medium text-muted">
                          Até
                        </span>
                        <input
                          type="date"
                          className="input-field !py-1.5 text-sm"
                          value={to}
                          onChange={(e) => {
                            setCustomRange(true);
                            setTo(e.target.value);
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        className="btn-primary col-span-2 mt-1 !py-2 text-sm"
                        onClick={() => setRangeOpen(false)}
                      >
                        Aplicar
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-muted-bg"
            >
              Exportar
            </button>
          </div>
        </div>

        {filtersOpen && (
          <div className="flex flex-wrap items-end gap-3 border-t border-border bg-muted-bg/40 px-4 py-3">
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-muted">Status</span>
              <select
                className="input-field !w-auto min-w-[8.5rem]"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="PAID">Pago</option>
                <option value="PENDING">Pendente</option>
                <option value="FAILED">Falhou</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-muted">Método</span>
              <select
                className="input-field !w-auto min-w-[7.5rem]"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="PIX">PIX</option>
                <option value="CARD">Cartão</option>
              </select>
            </label>
            {!isProfessionalView && (
              <>
                <label className="block text-sm">
                  <span className="mb-1 block text-xs text-muted">Tipo</span>
                  <select
                    className="input-field !w-auto min-w-[9rem]"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="booking">Agendamento</option>
                    <option value="checkout">Checkout</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-xs text-muted">Agenda</span>
                  <select
                    className="input-field !w-auto min-w-[10rem]"
                    value={pageId}
                    onChange={(e) => setPageId(e.target.value)}
                  >
                    <option value="">Todas</option>
                    {pages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {hasFilters && (
              <button
                type="button"
                className="mb-0.5 text-xs font-medium text-muted underline-offset-2 hover:text-foreground hover:underline"
                onClick={() => {
                  setStatus("");
                  setMethod("");
                  setType("");
                  setPageId("");
                }}
              >
                Limpar
              </button>
            )}
          </div>
        )}
      </div>

      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label={isProfessionalView ? "Valor gerado" : "Receitas"}
            value={formatBRL(summary.receitas)}
            hint="Confirmado no período"
            tone="money"
          />
          {(summary.comissaoTotal ?? 0) > 0 || isProfessionalView ? (
            <KpiCard
              label={isProfessionalView ? "Sua comissão" : "Comissão equipe"}
              value={formatBRL(summary.comissaoTotal || 0)}
              hint={
                isProfessionalView
                  ? "Com base no % cadastrado"
                  : "Soma das comissões ativas"
              }
              tone="blue"
            />
          ) : (
            <KpiCard
              label="Pendente"
              value={formatBRL(summary.pendente)}
              hint="Cobranças em aberto"
              tone="warn"
            />
          )}
          {!isProfessionalView && (summary.comissaoTotal ?? 0) > 0 ? (
            <KpiCard
              label="Líquido salão"
              value={formatBRL(summary.liquidoSalao || 0)}
              hint="Receitas − comissão"
              tone="ink"
            />
          ) : (
            <KpiCard
              label="Confirmados"
              value={String(summary.confirmados)}
              hint="Pagamentos confirmados"
              tone="blue"
            />
          )}
          <KpiCard
            label={(summary.comissaoTotal ?? 0) > 0 && !isProfessionalView ? "Pendente" : "Ticket médio"}
            value={
              (summary.comissaoTotal ?? 0) > 0 && !isProfessionalView
                ? formatBRL(summary.pendente)
                : formatBRL(summary.ticketMedio)
            }
            hint={
              (summary.comissaoTotal ?? 0) > 0 && !isProfessionalView
                ? "Cobranças em aberto"
                : "Por pagamento confirmado"
            }
            tone={(summary.comissaoTotal ?? 0) > 0 && !isProfessionalView ? "warn" : "ink"}
          />
        </div>
      )}

      {series && <FinanceiroCharts series={series} />}

      {loading ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : payments.length === 0 ? (
        <div className="surface px-6 py-12 text-center">
          <p className="text-sm font-medium">Nenhum pagamento encontrado</p>
          <p className="mt-1 text-sm text-muted">
            {isProfessionalView
              ? "Não há pagamentos dos seus agendamentos neste período."
              : "Ajuste o período ou os filtros para ver movimentações."}
          </p>
        </div>
      ) : (
        <div className="surface overflow-hidden">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold tracking-tight">
              Movimentações
            </h2>
            <p className="text-xs text-muted">
              Lista detalhada do período filtrado
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border bg-muted-bg/70 text-muted">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide">
                    Data
                  </th>
                  {!isProfessionalView && (
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                      Tipo
                    </th>
                  )}
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                    Referência
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                    Valor
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                    Comissão
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((p) => {
                  const customerName =
                    p.booking?.customerName || p.checkout?.customerName || "—";
                  const customerEmail =
                    p.booking?.customerEmail || p.checkout?.customerEmail || "";
                  const refTitle =
                    p.booking?.serviceTitle || p.checkout?.productTitle || "—";
                  const refSub = [
                    p.booking?.professionalName,
                    p.booking?.pageTitle ||
                      (p.type === "checkout" ? "Checkout" : ""),
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  const commission = p.commissionCents || 0;
                  return (
                    <tr
                      key={p.id}
                      className="transition hover:bg-muted-bg/40"
                    >
                      <td className="whitespace-nowrap px-5 py-3.5 text-muted">
                        {format(
                          new Date(p.paidAt || p.createdAt),
                          "dd/MM/yyyy HH:mm",
                        )}
                      </td>
                      {!isProfessionalView && (
                        <td className="px-4 py-3.5">
                          <span className="rounded-md border border-border bg-white px-2 py-0.5 text-[11px] font-medium">
                            {p.type === "checkout" ? "Checkout" : "Agendamento"}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3.5">
                        <p className="font-medium">{customerName}</p>
                        <p className="text-xs text-muted">{customerEmail}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        {refTitle}
                        {refSub && (
                          <p className="text-xs text-muted">{refSub}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold tabular-nums text-money">
                          {formatBRL(p.amountCents)}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">{p.method}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        {commission > 0 ? (
                          <>
                            <p className="font-semibold tabular-nums">
                              {formatBRL(commission)}
                            </p>
                            {p.booking?.commissionPercent != null && (
                              <p className="mt-0.5 text-xs text-muted">
                                {p.booking.commissionPercent}%
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                            statusTone[p.status] ||
                            "border-border bg-muted-bg text-muted"
                          }`}
                        >
                          {statusLabel[p.status] || p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <Link
                          href={
                            p.type === "checkout" && !isProfessionalView
                              ? "/app/checkout/vendas"
                              : "/app/agenda/listagem"
                          }
                          className="text-xs font-medium text-muted hover:text-foreground hover:underline"
                        >
                          {p.type === "checkout" && !isProfessionalView
                            ? "Ver vendas"
                            : "Ver agenda"}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
