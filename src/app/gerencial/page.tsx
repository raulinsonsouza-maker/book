"use client";

import { useEffect, useState } from "react";
import { formatBRL } from "@/lib/utils";

type Stats = {
  orgsTotal: number;
  orgsActive: number;
  trials: number;
  usersTotal: number;
  signups7d: number;
  signups30d: number;
  pastDue: number;
  suspended: number;
  mrrCents: number;
  bookings30d: number;
};

export default function GerencialDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/gerencial/dashboard")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  if (!stats) {
    return <p className="text-sm text-muted">Carregando métricas…</p>;
  }

  const cards = [
    { label: "Empresas", value: stats.orgsTotal },
    { label: "Assinaturas ativas", value: stats.orgsActive },
    { label: "Em trial", value: stats.trials },
    { label: "Usuários", value: stats.usersTotal },
    { label: "Novos (7 dias)", value: stats.signups7d },
    { label: "Novos (30 dias)", value: stats.signups30d },
    { label: "Em atraso", value: stats.pastDue },
    { label: "Suspensas", value: stats.suspended },
    { label: "MRR estimado", value: formatBRL(stats.mrrCents) },
    { label: "Agendamentos (30d)", value: stats.bookings30d },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
        Painel da plataforma Symbius. Use com cuidado — alterações afetam
        clientes reais.
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="surface p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {c.label}
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
