"use client";

import { useCallback, useEffect, useState } from "react";

type Row = {
  id: string;
  organizationId: string | null;
  category: string;
  templateName: string;
  toPhoneE164: string;
  status: string;
  billable: boolean;
  error: string | null;
  createdAt: string;
  organization: { id: string; name: string; slug: string } | null;
};

export default function AdminMensagensPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(page),
      take: "40",
    });
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (category) params.set("category", category);
    const res = await fetch(`/api/admin/whatsapp/messages?${params}`);
    if (!res.ok) return;
    const d = await res.json();
    setRows(d.rows);
    setTotal(d.total);
  }, [page, q, status, category]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          className="input-field max-w-xs"
          placeholder="Buscar telefone, org, template…"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
        />
        <select
          className="input-field max-w-[10rem]"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">Status</option>
          <option value="queued">queued</option>
          <option value="sent">sent</option>
          <option value="delivered">delivered</option>
          <option value="read">read</option>
          <option value="failed">failed</option>
        </select>
        <select
          className="input-field max-w-[10rem]"
          value={category}
          onChange={(e) => {
            setPage(1);
            setCategory(e.target.value);
          }}
        >
          <option value="">Categoria</option>
          <option value="AUTH">AUTH</option>
          <option value="UTILITY">UTILITY</option>
          <option value="MARKETING">MARKETING</option>
        </select>
      </div>

      <div className="surface overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border text-xs text-muted">
            <tr>
              <th className="px-3 py-2">Quando</th>
              <th className="px-3 py-2">Org</th>
              <th className="px-3 py-2">Para</th>
              <th className="px-3 py-2">Template</th>
              <th className="px-3 py-2">Cat</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/60">
                <td className="px-3 py-2 whitespace-nowrap">
                  {new Date(r.createdAt).toLocaleString("pt-BR")}
                </td>
                <td className="px-3 py-2">{r.organization?.name || "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.toPhoneE164}</td>
                <td className="px-3 py-2">{r.templateName}</td>
                <td className="px-3 py-2">{r.category}</td>
                <td className="px-3 py-2">
                  {r.status}
                  {r.error ? (
                    <span className="block text-xs text-danger">{r.error}</span>
                  ) : null}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted">
                  Nenhuma mensagem
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
