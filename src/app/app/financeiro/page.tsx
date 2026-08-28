"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { format, subDays } from "date-fns";
import { formatBRL } from "@/lib/utils";

type PageOption = { id: string; title: string };

type PaymentRow = {
  id: string;
  type: "booking" | "checkout";
  status: string;
  method: string;
  amountCents: number;
  paidAt: string | null;
  booking?: {
    id: string;
    customerName: string;
    customerEmail: string;
    startAt: string;
    serviceTitle: string;
    pageTitle: string;
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
};

const statusLabel: Record<string, string> = {
  PAID: "Pago",
  PENDING: "Pendente",
  FAILED: "Falhou",
  REFUNDED: "Estornado",
};

export default function FinanceiroPage() {
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
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pages")
      .then((r) => r.json())
      .then((data) => setPages(Array.isArray(data) ? data : []));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ from, to });
    if (status) params.set("status", status);
    if (method) params.set("method", method);
    if (pageId) params.set("bookingPageId", pageId);
    if (type) params.set("type", type);
    fetch(`/api/financeiro?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setSummary(data.summary);
        setPayments(data.payments || []);
      })
      .finally(() => setLoading(false));
  }, [from, to, status, method, pageId, type]);

  useEffect(() => {
    load();
  }, [load]);

  function exportCsv() {
    const params = new URLSearchParams({ from, to });
    if (status) params.set("status", status);
    if (method) params.set("method", method);
    if (pageId) params.set("bookingPageId", pageId);
    if (type) params.set("type", type);
    window.location.href = `/api/financeiro/export?${params}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Financeiro</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Receitas</h1>
          <p className="mt-2 text-sm text-muted">
            Pagamentos de agendamentos e checkout no período selecionado.
          </p>
        </div>
        <button type="button" onClick={exportCsv} className="btn-secondary">
          Exportar CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-muted">De</span>
          <input
            type="date"
            className="input-field !w-auto"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">Até</span>
          <input
            type="date"
            className="input-field !w-auto"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">Status</span>
          <select
            className="input-field !w-auto"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="PAID">Pago</option>
            <option value="PENDING">Pendente</option>
            <option value="FAILED">Falhou</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">Método</span>
          <select
            className="input-field !w-auto"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="PIX">PIX</option>
            <option value="CARD">Cartão</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">Tipo</span>
          <select
            className="input-field !w-auto"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="booking">Agendamento</option>
            <option value="checkout">Checkout</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">Página</span>
          <select
            className="input-field !w-auto min-w-[160px]"
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
      </div>

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="surface p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Receitas
            </p>
            <p className="mt-1 text-2xl font-bold text-money">
              {formatBRL(summary.receitas)}
            </p>
          </div>
          <div className="surface p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Pendente
            </p>
            <p className="mt-1 text-2xl font-bold">{formatBRL(summary.pendente)}</p>
          </div>
          <div className="surface p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Pagamentos confirmados
            </p>
            <p className="mt-1 text-2xl font-bold">{summary.confirmados}</p>
          </div>
          <div className="surface p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Ticket médio
            </p>
            <p className="mt-1 text-2xl font-bold">{formatBRL(summary.ticketMedio)}</p>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : payments.length === 0 ? (
        <p className="surface p-8 text-sm text-muted">
          Nenhum pagamento no período.
        </p>
      ) : (
        <div className="surface overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted-bg text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Referência</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((p) => {
                const customerName = p.booking?.customerName || p.checkout?.customerName || "—";
                const customerEmail = p.booking?.customerEmail || p.checkout?.customerEmail || "";
                const refTitle = p.booking?.serviceTitle || p.checkout?.productTitle || "—";
                const refSub = p.booking?.pageTitle || (p.type === "checkout" ? "Checkout" : "");
                return (
                <tr key={p.id}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {p.paidAt
                      ? format(new Date(p.paidAt), "dd/MM/yyyy HH:mm")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="tag">{p.type === "checkout" ? "Checkout" : "Agendamento"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{customerName}</p>
                    <p className="text-xs text-muted">{customerEmail}</p>
                  </td>
                  <td className="px-4 py-3">
                    {refTitle}
                    {refSub && <p className="text-xs text-muted">{refSub}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="tag tag-money">{formatBRL(p.amountCents)}</span>
                    <p className="mt-1 text-xs text-muted">{p.method}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="tag">{statusLabel[p.status] || p.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={p.type === "checkout" ? "/app/checkout/vendas" : "/app/agenda/listagem"}
                      className="text-xs text-muted hover:text-foreground hover:underline"
                    >
                      {p.type === "checkout" ? "Ver vendas" : "Ver agenda"}
                    </Link>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
