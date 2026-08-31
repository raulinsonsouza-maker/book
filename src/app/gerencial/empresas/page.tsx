"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  subscriptionStatus: string;
  createdAt: string;
  _count: { memberships: number; bookingPages: number };
  subscription: { plan: { name: string } | null; trialEndsAt: string | null } | null;
};

const STATUS_LABEL: Record<string, string> = {
  TRIALING: "Trial",
  ACTIVE: "Ativa",
  PAST_DUE: "Em atraso",
  SUSPENDED: "Suspensa",
  CANCELED: "Cancelada",
};

export default function GerencialEmpresasPage() {
  const [rows, setRows] = useState<OrgRow[]>([]);
  const [q, setQ] = useState("");

  async function load() {
    const res = await fetch(`/api/gerencial/organizations?q=${encodeURIComponent(q)}`);
    if (res.ok) setRows(await res.json());
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <input
          className="input-field max-w-md flex-1"
          placeholder="Buscar por nome ou slug"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit" className="btn-secondary">
          Buscar
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border bg-muted-bg/50 text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Empresa</th>
              <th className="px-4 py-3 font-semibold">Plano</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Usuários</th>
              <th className="px-4 py-3 font-semibold">Páginas</th>
              <th className="px-4 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{o.name}</p>
                  <p className="text-xs text-muted">{o.slug}</p>
                </td>
                <td className="px-4 py-3 text-muted">
                  {o.subscription?.plan?.name ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="tag">
                    {STATUS_LABEL[o.subscriptionStatus] ?? o.subscriptionStatus}
                  </span>
                </td>
                <td className="px-4 py-3">{o._count.memberships}</td>
                <td className="px-4 py-3">{o._count.bookingPages}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/gerencial/empresas/${o.id}`}
                    className="text-sm font-medium underline-offset-2 hover:underline"
                  >
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
