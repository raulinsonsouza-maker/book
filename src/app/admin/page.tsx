"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatBRL } from "@/lib/utils";

type Dashboard = {
  generatedAt: string;
  orgsTotal: number;
  orgsActive: number;
  trials: number;
  usersTotal: number;
  signups7d: number;
  signups30d: number;
  pastDue: number;
  suspended: number;
  canceled: number;
  mrrCents: number;
  arrCents: number;
  revenue30dCents: number;
  revenue7dCents: number;
  payments30d: number;
  paidPayments30d: number;
  bookings30d: number;
  bookingsConfirmed30d: number;
  signupsSeries: { date: string; count: number }[];
  planMix: {
    name: string;
    slug: string;
    interval: string;
    count: number;
    mrrCents: number;
  }[];
  recentOrgs: {
    id: string;
    name: string;
    slug: string;
    subscriptionStatus: string;
    createdAt: string;
    planName: string | null;
    trialEndsAt: string | null;
    members: number;
  }[];
  attention: {
    pastDue: {
      id: string;
      name: string;
      slug: string;
      planName: string | null;
      updatedAt: string;
    }[];
    trialsEnding: {
      id: string;
      name: string;
      slug: string;
      trialEndsAt: string | null;
    }[];
    suspended: {
      id: string;
      name: string;
      slug: string;
      updatedAt: string;
    }[];
  };
  health: {
    billingEnabled: boolean;
    mpConfigured: boolean;
    mpOk: boolean;
    mpNickname: string | null;
    mpError: string | null;
  };
};

const STATUS_META: Record<
  string,
  { label: string; className: string }
> = {
  TRIALING: {
    label: "Trial",
    className: "bg-sky-50 text-sky-800 ring-sky-200",
  },
  ACTIVE: {
    label: "Ativa",
    className: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  },
  PAST_DUE: {
    label: "Em atraso",
    className: "bg-amber-50 text-amber-900 ring-amber-200",
  },
  SUSPENDED: {
    label: "Suspensa",
    className: "bg-rose-50 text-rose-800 ring-rose-200",
  },
  CANCELED: {
    label: "Cancelada",
    className: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  },
};

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status] || {
    label: status,
    className: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

function HealthDot({
  ok,
  warn,
  label,
}: {
  ok: boolean;
  warn?: boolean;
  label: string;
}) {
  const color = ok
    ? "bg-emerald-500"
    : warn
      ? "bg-amber-500"
      : "bg-rose-500";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-[11px] font-medium text-foreground">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function MetricCard({
  label,
  value,
  hint,
  href,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  tone?: "neutral" | "money" | "warn" | "danger" | "info";
}) {
  const toneBorder =
    tone === "money"
      ? "border-emerald-200/80"
      : tone === "warn"
        ? "border-amber-200/80"
        : tone === "danger"
          ? "border-rose-200/80"
          : tone === "info"
            ? "border-sky-200/80"
            : "border-border";

  const inner = (
    <div
      className={`surface h-full border ${toneBorder} p-4 transition ${href ? "hover:border-foreground/20 hover:shadow-sm" : ""}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {inner}
      </Link>
    );
  }
  return inner;
}

function SignupsChart({ series }: { series: Dashboard["signupsSeries"] }) {
  const max = Math.max(1, ...series.map((s) => s.count));
  const total = series.reduce((sum, s) => sum + s.count, 0);
  const width = 560;
  const height = 140;
  const padX = 8;
  const padY = 16;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2 - 18;
  const gap = 4;
  const barW =
    series.length > 0
      ? Math.max(6, (chartW - gap * (series.length - 1)) / series.length)
      : 10;

  return (
    <div className="surface overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            Novas empresas
          </h2>
          <p className="mt-0.5 text-xs text-muted">Últimos 14 dias</p>
        </div>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-zinc-700">
          {total} no período
        </span>
      </div>
      <div className="px-3 pb-3 pt-2">
        {total === 0 ? (
          <p className="px-2 py-12 text-center text-sm text-muted">
            Nenhuma empresa nova nos últimos 14 dias.
          </p>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-[140px] w-full"
            role="img"
            aria-label="Novas empresas por dia"
          >
            {series.map((point, i) => {
              const h = (point.count / max) * chartH;
              const x = padX + i * (barW + gap);
              const y = padY + chartH - h;
              const label = format(parseISO(point.date), "dd", {
                locale: ptBR,
              });
              return (
                <g key={point.date}>
                  <rect
                    x={x}
                    y={y}
                    width={barW}
                    height={Math.max(h, point.count > 0 ? 2 : 0)}
                    rx={3}
                    fill={point.count > 0 ? "#0a0a0a" : "#e5e7eb"}
                  />
                  <text
                    x={x + barW / 2}
                    y={height - 2}
                    textAnchor="middle"
                    fill="#9ca3af"
                    fontSize="9"
                  >
                    {label}
                  </text>
                  {point.count > 0 && (
                    <title>
                      {format(parseISO(point.date), "dd MMM", { locale: ptBR })}
                      : {point.count}
                    </title>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then(async (r) => {
        if (!r.ok) throw new Error("Falha ao carregar");
        return r.json();
      })
      .then(setData)
      .catch(() => setError("Não foi possível carregar as métricas."));
  }, []);

  const attentionCount = useMemo(() => {
    if (!data) return 0;
    return (
      data.attention.pastDue.length +
      data.attention.trialsEnding.length +
      data.attention.suspended.length
    );
  }, [data]);

  if (error) {
    return (
      <div className="surface border border-rose-200 bg-rose-50/50 p-5 text-sm text-rose-800">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-2xl bg-white/70" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-white/70" />
          ))}
        </div>
      </div>
    );
  }

  const conversion =
    data.bookings30d > 0
      ? Math.round((data.bookingsConfirmed30d / data.bookings30d) * 100)
      : null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="relative px-5 py-5 md:px-7 md:py-6">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.55]"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 0% 0%, #ecfdf5 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 100% 0%, #f4f4f5 0%, transparent 50%)",
            }}
          />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                Visão geral
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-[1.75rem]">
                Operação da plataforma
              </h2>
              <p className="mt-1.5 max-w-xl text-sm text-muted">
                Receita, assinaturas e saúde do funil — atualizado{" "}
                {format(parseISO(data.generatedAt), "dd MMM · HH:mm", {
                  locale: ptBR,
                })}
                .
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <HealthDot
                  ok={data.health.billingEnabled}
                  warn={!data.health.billingEnabled}
                  label={
                    data.health.billingEnabled
                      ? "Cobrança ligada"
                      : "Cobrança desligada"
                  }
                />
                <HealthDot
                  ok={data.health.mpConfigured && data.health.mpOk}
                  warn={data.health.mpConfigured && !data.health.mpOk}
                  label={
                    !data.health.mpConfigured
                      ? "MP não configurado"
                      : data.health.mpOk
                        ? data.health.mpNickname
                          ? `MP · ${data.health.mpNickname}`
                          : "MP conectado"
                        : "MP com falha"
                  }
                />
                {attentionCount > 0 && (
                  <HealthDot
                    ok={false}
                    warn={data.pastDue + data.suspended === 0}
                    label={`${attentionCount} atenção`}
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[28rem]">
              <div className="rounded-xl border border-border bg-white/80 px-3.5 py-3 backdrop-blur">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  MRR
                </p>
                <p className="mt-1 text-xl font-bold tracking-tight tabular-nums text-emerald-700">
                  {formatBRL(data.mrrCents)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-white/80 px-3.5 py-3 backdrop-blur">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  ARR
                </p>
                <p className="mt-1 text-xl font-bold tracking-tight tabular-nums">
                  {formatBRL(data.arrCents)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-white/80 px-3.5 py-3 backdrop-blur">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Receita 30d
                </p>
                <p className="mt-1 text-xl font-bold tracking-tight tabular-nums">
                  {formatBRL(data.revenue30dCents)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-white/80 px-3.5 py-3 backdrop-blur">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Ativas
                </p>
                <p className="mt-1 text-xl font-bold tracking-tight tabular-nums">
                  {data.orgsActive}
                  <span className="text-sm font-medium text-muted">
                    /{data.orgsTotal}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Em trial"
          value={data.trials}
          hint="Assinaturas em teste"
          href="/admin/assinaturas"
          tone="info"
        />
        <MetricCard
          label="Em atraso"
          value={data.pastDue}
          hint="Precisam regularizar"
          href="/admin/empresas"
          tone={data.pastDue > 0 ? "warn" : "neutral"}
        />
        <MetricCard
          label="Suspensas"
          value={data.suspended}
          hint="Acesso bloqueado"
          href="/admin/empresas"
          tone={data.suspended > 0 ? "danger" : "neutral"}
        />
        <MetricCard
          label="Receita 7d"
          value={formatBRL(data.revenue7dCents)}
          hint={`${data.paidPayments30d} pagos · 30d`}
          href="/admin/pagamentos"
          tone="money"
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Usuários"
          value={data.usersTotal}
          href="/admin/usuarios"
        />
        <MetricCard
          label="Novas empresas · 7d"
          value={data.signups7d}
          hint={`${data.signups30d} nos últimos 30 dias`}
          href="/admin/empresas"
        />
        <MetricCard
          label="Agendamentos · 30d"
          value={data.bookings30d}
          hint={
            conversion != null
              ? `${data.bookingsConfirmed30d} confirmados (${conversion}%)`
              : "Sem volume ainda"
          }
        />
        <MetricCard
          label="Canceladas"
          value={data.canceled}
          hint="Status CANCELED"
          href="/admin/assinaturas"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <SignupsChart series={data.signupsSeries} />
        </div>

        <div className="surface xl:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">
                Mix de planos
              </h2>
              <p className="mt-0.5 text-xs text-muted">Assinaturas ativas</p>
            </div>
            <Link
              href="/admin/planos"
              className="text-xs font-semibold text-muted underline-offset-2 hover:text-foreground hover:underline"
            >
              Gerir
            </Link>
          </div>
          <div className="divide-y divide-border">
            {data.planMix.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted">
                Nenhuma assinatura ativa com plano.
              </p>
            ) : (
              data.planMix.map((plan) => {
                const share =
                  data.mrrCents > 0
                    ? Math.round((plan.mrrCents / data.mrrCents) * 100)
                    : 0;
                return (
                  <div key={plan.slug} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {plan.name}
                        </p>
                        <p className="text-xs text-muted">
                          {plan.count}{" "}
                          {plan.count === 1 ? "empresa" : "empresas"} ·{" "}
                          {plan.interval === "SEMESTER" ? "semestral" : "mensal"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums">
                          {formatBRL(plan.mrrCents)}
                        </p>
                        <p className="text-[11px] text-muted">{share}% MRR</p>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-foreground"
                        style={{ width: `${Math.max(share, share > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="surface">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">
                Precisa de atenção
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                Atrasos, trials acabando e suspensas
              </p>
            </div>
            {attentionCount === 0 && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                Tudo ok
              </span>
            )}
          </div>
          <div className="max-h-[22rem] space-y-1 overflow-y-auto p-2">
            {attentionCount === 0 && (
              <p className="px-3 py-10 text-center text-sm text-muted">
                Nenhum alerta crítico no momento.
              </p>
            )}
            {data.attention.pastDue.map((o) => (
              <Link
                key={`pd-${o.id}`}
                href={`/admin/empresas/${o.id}`}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition hover:bg-amber-50/80"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{o.name}</p>
                  <p className="text-xs text-muted">
                    {o.planName || "Sem plano"} · atraso
                  </p>
                </div>
                <StatusPill status="PAST_DUE" />
              </Link>
            ))}
            {data.attention.trialsEnding.map((o) => (
              <Link
                key={`tr-${o.id}`}
                href={`/admin/empresas/${o.id}`}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition hover:bg-sky-50/80"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{o.name}</p>
                  <p className="text-xs text-muted">
                    Trial até{" "}
                    {o.trialEndsAt
                      ? format(parseISO(o.trialEndsAt), "dd MMM", {
                          locale: ptBR,
                        })
                      : "—"}
                  </p>
                </div>
                <StatusPill status="TRIALING" />
              </Link>
            ))}
            {data.attention.suspended.map((o) => (
              <Link
                key={`su-${o.id}`}
                href={`/admin/empresas/${o.id}`}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition hover:bg-rose-50/80"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{o.name}</p>
                  <p className="text-xs text-muted">Conta suspensa</p>
                </div>
                <StatusPill status="SUSPENDED" />
              </Link>
            ))}
          </div>
        </div>

        <div className="surface">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">
                Empresas recentes
              </h2>
              <p className="mt-0.5 text-xs text-muted">Últimas cadastros</p>
            </div>
            <Link
              href="/admin/empresas"
              className="text-xs font-semibold text-muted underline-offset-2 hover:text-foreground hover:underline"
            >
              Ver todas
            </Link>
          </div>
          <div className="divide-y divide-border">
            {data.recentOrgs.map((o) => (
              <Link
                key={o.id}
                href={`/admin/empresas/${o.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-zinc-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{o.name}</p>
                  <p className="truncate text-xs text-muted">
                    /{o.slug} · {o.members}{" "}
                    {o.members === 1 ? "membro" : "membros"}
                    {o.planName ? ` · ${o.planName}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusPill status={o.subscriptionStatus} />
                  <span className="text-[11px] tabular-nums text-muted">
                    {format(parseISO(o.createdAt), "dd MMM", { locale: ptBR })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            href: "/admin/config",
            title: "Mercado Pago",
            desc: data.health.mpConfigured
              ? "Credenciais e cobrança SaaS"
              : "Conectar para receber assinaturas",
          },
          {
            href: "/admin/planos",
            title: "Planos",
            desc: "Mensal e semestral do checkout",
          },
          {
            href: "/admin/pagamentos",
            title: "Pagamentos",
            desc: `${data.payments30d} eventos nos últimos 30 dias`,
          },
          {
            href: "/admin/whatsapp",
            title: "WhatsApp",
            desc: "Canal, cotas e templates",
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="surface group flex items-start justify-between gap-3 p-4 transition hover:border-foreground/20 hover:shadow-sm"
          >
            <div>
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="mt-1 text-xs text-muted">{item.desc}</p>
            </div>
            <span className="text-muted transition group-hover:translate-x-0.5 group-hover:text-foreground">
              →
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
