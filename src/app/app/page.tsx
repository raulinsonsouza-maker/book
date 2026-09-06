import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { requireOrg } from "@/lib/session";
import {
  getAuthContext,
  isProfessionalRole,
  isTeamMemberRole,
} from "@/lib/rbac";
import { getDashboardStats } from "@/lib/dashboard-stats";
import { DashboardStatCard } from "@/components/admin/DashboardStatCard";
import { DashboardTrendChart } from "@/components/admin/DashboardTrendChart";
import {
  DashboardUtilization,
  buildUtilizationItems,
} from "@/components/admin/DashboardUtilization";
import { PaymentSetupBanner } from "@/components/admin/PaymentSetupBanner";

type ProStats = Awaited<ReturnType<typeof getDashboardStats>>;

function ProfessionalHome({
  stats,
  userName,
}: {
  stats: ProStats;
  userName?: string | null;
}) {
  const firstName = userName?.trim().split(/\s+/)[0];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          {firstName ? `Olá, ${firstName}` : "Sua agenda"}
        </h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <DashboardStatCard
          title="Hoje"
          value={stats.todayCount}
          href="/app/agenda/calendario"
          variant="blue"
        />
        <DashboardStatCard
          title="Amanhã"
          value={stats.tomorrowCount}
          href="/app/agenda/calendario"
          variant="pink"
        />
      </div>

      <div className="dashboard-panel rounded-xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight">Próximos</h2>
          <Link
            href="/app/agenda/listagem"
            className="text-xs font-medium text-[#2563eb] hover:underline"
          >
            Ver todos
          </Link>
        </div>

        {stats.upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Nada confirmado nos próximos dias.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {stats.upcoming.map((b) => {
              const local = toZonedTime(b.startAt, b.timezone);
              return (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-4 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{b.customerName}</p>
                    <p className="truncate text-xs text-muted">{b.service.title}</p>
                  </div>
                  <p className="shrink-0 text-right text-xs text-muted">
                    {format(local, "dd MMM · HH:mm", { locale: ptBR })}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default async function AppHomePage() {
  const { org } = await requireOrg();
  const ctx = await getAuthContext();

  if (ctx && isTeamMemberRole(ctx.role)) {
    redirect("/app/intake");
  }

  const isPro = Boolean(
    ctx && isProfessionalRole(ctx.role) && ctx.professionalId,
  );
  const stats = await getDashboardStats(org.id, org.timezone, {
    professionalId: isPro ? ctx!.professionalId : null,
  });

  if (isPro) {
    return <ProfessionalHome stats={stats} userName={ctx?.name} />;
  }

  const chartTotals = stats.chartMonths.reduce(
    (acc, m) => ({
      scheduled: acc.scheduled + m.scheduled,
      confirmed: acc.confirmed + m.confirmed,
    }),
    { scheduled: 0, confirmed: 0 },
  );

  return (
    <div className="space-y-4">
      {!stats.paymentReady && (
        <PaymentSetupBanner organizationId={org.id} />
      )}

      {stats.totalServices === 0 && (
        <div className="dashboard-panel flex flex-wrap items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-semibold">Configure os serviços</span>
            <span className="text-muted"> para liberar horários no link</span>
          </p>
          <Link
            href="/app/servicos"
            className="btn-primary shrink-0 !px-3 !py-1.5 !text-xs"
          >
            Serviços
          </Link>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <DashboardStatCard
          title="Hoje"
          value={stats.todayCount}
          href="/app/agenda/calendario"
          variant="blue"
        />
        <DashboardStatCard
          title="Amanhã"
          value={stats.tomorrowCount}
          href="/app/agenda/calendario"
          variant="pink"
        />
        <DashboardStatCard
          title="Links"
          value={stats.activePages}
          href="/app/agendador"
          variant="orange"
        />
      </div>

      {org.businessMode === "SALON" && (
        <Link
          href="/app/salao"
          className="dashboard-panel flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-sm transition hover:ring-1 hover:ring-foreground/10"
        >
          <span className="text-sm font-semibold tracking-tight">
            Gestão à vista
          </span>
          <span className="text-xs font-semibold text-[#2563eb]">Abrir →</span>
        </Link>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <DashboardTrendChart
          months={stats.chartMonths}
          maxValue={stats.maxChart}
          totalScheduled={chartTotals.scheduled}
          totalConfirmed={chartTotals.confirmed}
        />

        <div className="dashboard-panel rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold tracking-tight">Próximos</h2>
            <Link
              href="/app/agenda/listagem"
              className="text-xs font-medium text-[#2563eb] hover:underline"
            >
              Lista
            </Link>
          </div>
          {stats.upcoming.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nenhum nas próximas horas.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {stats.upcoming.slice(0, 5).map((b) => {
                const local = toZonedTime(b.startAt, b.timezone);
                return (
                  <li
                    key={b.id}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{b.customerName}</p>
                      <p className="truncate text-xs text-muted">
                        {b.service.title}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-muted">
                      {format(local, "dd MMM · HH:mm", { locale: ptBR })}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <DashboardUtilization items={buildUtilizationItems(stats)} />
    </div>
  );
}
