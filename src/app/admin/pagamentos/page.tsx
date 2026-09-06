"use client";

import { useCallback, useEffect, useState } from "react";
import { formatBRL } from "@/lib/utils";

type PayRow = {
  id: string;
  amountCents: number;
  status: string;
  description: string | null;
  createdAt: string;
  organization: { name: string; slug: string };
};

type MpStatus = {
  configured: boolean;
  billingEnabled: boolean;
  ping: { ok: boolean; nickname?: string; error?: string } | null;
};

export default function AdminPagamentosPage() {
  const [payments, setPayments] = useState<PayRow[]>([]);
  const [total, setTotal] = useState(0);
  const [mp, setMp] = useState<MpStatus | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), take: "40" });
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const [p, s] = await Promise.all([
      fetch(`/api/admin/payments?${params}`).then((r) => r.json()),
      fetch("/api/admin/payments/status").then((r) => r.json()),
    ]);
    setPayments(p.payments || []);
    setTotal(p.total || 0);
    setMp(s);
  }, [page, q, status, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  function exportCsv() {
    const params = new URLSearchParams({ format: "csv" });
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    window.location.href = `/api/admin/payments?${params}`;
  }

  return (
    <div className="space-y-6">
      <div className="surface space-y-2 p-5">
        <h2 className="font-semibold">Mercado Pago da Symbius</h2>
        {!mp ? (
          <p className="text-sm text-muted">Carregando…</p>
        ) : (
          <>
            <p className="text-sm">
              Billing:{" "}
              <strong>{mp.billingEnabled ? "ativado" : "desativado"}</strong>
            </p>
            <p className="text-sm">
              Credenciais:{" "}
              <strong>{mp.configured ? "configuradas" : "faltando no .env"}</strong>
            </p>
            {mp.ping && (
              <p className="text-sm text-muted">
                {mp.ping.ok
                  ? `Conexão OK${mp.ping.nickname ? ` (${mp.ping.nickname})` : ""}`
                  : `Erro: ${mp.ping.error}`}
              </p>
            )}
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          className="input-field max-w-xs"
          placeholder="Buscar empresa / id…"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
        />
        <select
          className="input-field max-w-[9rem]"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">Status</option>
          <option value="paid">paid</option>
          <option value="pending">pending</option>
          <option value="failed">failed</option>
        </select>
        <input
          type="date"
          className="input-field max-w-[11rem]"
          value={from}
          onChange={(e) => {
            setPage(1);
            setFrom(e.target.value);
          }}
        />
        <input
          type="date"
          className="input-field max-w-[11rem]"
          value={to}
          onChange={(e) => {
            setPage(1);
            setTo(e.target.value);
          }}
        />
        <button type="button" className="btn-secondary" onClick={exportCsv}>
          Exportar CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted-bg/50 text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Data</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">{p.organization.name}</td>
                <td className="px-4 py-3">{formatBRL(p.amountCents)}</td>
                <td className="px-4 py-3">{p.status}</td>
                <td className="px-4 py-3">
                  {new Date(p.createdAt).toLocaleString("pt-BR")}
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  Nenhum pagamento
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">{total} no total</span>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={page * 40 >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}
