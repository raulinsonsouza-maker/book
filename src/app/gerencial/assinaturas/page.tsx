"use client";

import { useEffect, useState } from "react";

type SubRow = {
  id: string;
  status: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  organization: { name: string; slug: string };
  plan: { name: string; priceCents: number } | null;
};

export default function GerencialAssinaturasPage() {
  const [rows, setRows] = useState<SubRow[]>([]);

  useEffect(() => {
    fetch("/api/gerencial/subscriptions")
      .then((r) => r.json())
      .then(setRows);
  }, []);

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-border bg-muted-bg/50 text-xs uppercase text-muted">
          <tr>
            <th className="px-4 py-3 font-semibold">Empresa</th>
            <th className="px-4 py-3 font-semibold">Plano</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Trial / período</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3">
                <p className="font-medium">{s.organization.name}</p>
                <p className="text-xs text-muted">{s.organization.slug}</p>
              </td>
              <td className="px-4 py-3">{s.plan?.name ?? "—"}</td>
              <td className="px-4 py-3">
                <span className="tag">{s.status}</span>
              </td>
              <td className="px-4 py-3 text-muted">
                {s.trialEndsAt
                  ? `Trial até ${new Date(s.trialEndsAt).toLocaleDateString("pt-BR")}`
                  : s.currentPeriodEnd
                    ? `Até ${new Date(s.currentPeriodEnd).toLocaleDateString("pt-BR")}`
                    : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
