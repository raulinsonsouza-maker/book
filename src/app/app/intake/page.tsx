"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
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

const statusLabel: Record<string, string> = {
  PAID: "Pago",
  SUBMITTED: "Aguardando pagamento",
  DRAFT: "Rascunho",
};

const reviewLabel: Record<string, string> = {
  NEW: "Novo",
  IN_REVIEW: "Em análise",
  COMPLETED: "Concluído",
};

export default function IntakeListPage() {
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
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

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Dossiês de intake — formulários, documentos e pedidos pagos.
      </p>

      <CheckoutSubnav />

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Buscar nome ou e-mail"
          className="input-field max-w-xs"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="input-field max-w-[200px]"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          <option value="PAID">Pagos</option>
          <option value="SUBMITTED">Aguardando pagamento</option>
          <option value="DRAFT">Rascunho</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">Nenhum pedido intake encontrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted/5 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Docs</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.order.customerName}</p>
                    <p className="text-xs text-muted">{row.order.customerEmail}</p>
                  </td>
                  <td className="px-4 py-3">
                    {row.order.product.title}
                    <p className="text-xs text-muted">{formatBRL(row.order.product.priceCents)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-muted/10 px-2 py-0.5 text-xs">
                      {statusLabel[row.status] || row.status}
                    </span>
                    {!row.viewedAt && row.status === "PAID" && (
                      <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                        Novo
                      </span>
                    )}
                    <p className="mt-1 text-xs text-muted">
                      {reviewLabel[row.reviewStatus] || row.reviewStatus}
                    </p>
                  </td>
                  <td className="px-4 py-3">{row.attachmentCount}</td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {format(new Date(row.order.paidAt || row.createdAt), "dd/MM/yyyy HH:mm", {
                      locale: ptBR,
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/app/intake/${row.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      Ver dossiê →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
