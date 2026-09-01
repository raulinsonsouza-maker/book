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
import { paymentProviderLabel } from "@/lib/payments/resolve-provider";
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
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          {firstName ? `Olá, ${firstName}` : "Sua agenda"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Resumo dos seus agendamentos — somente o que está na sua agenda.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DashboardStatCard
          title="Hoje"
          value={stats.todayCount}
          href="/app/agenda/calendario"
          hrefLabel="Ver calendário"
          variant="blue"
        />
        <DashboardStatCard
          title="Amanhã"
          value={stats.tomorrowCount}
          href="/app/agenda/calendario"
          hrefLabel="Ver calendário"
          variant="pink"
        />
      </div>

      <div className="dashboard-panel rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight">
            Próximos na sua agenda
          </h2>
          <Link
            href="/app/agenda/listagem"
            className="text-xs font-medium text-[#2563eb] hover:underline"
          >
            Ver todos
          </Link>
        </div>

        {stats.upcoming.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            Nenhum agendamento confirmado nos próximos dias.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {stats.upcoming.map((b) => {
              const local = toZonedTime(b.startAt, b.timezone);
              return (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{b.customerName}</p>
                    <p className="truncate text-muted">{b.service.title}</p>
                  </div>
                  <p className="shrink-0 text-right text-muted">
                    {format(local, "dd MMM · HH:mm", { locale: ptBR })}
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/app/agenda/calendario" className="btn-primary !text-sm">
            Abrir calendário
          </Link>
          <Link href="/app/agenda/listagem" className="btn-secondary !text-sm">
            Lista de agendamentos
          </Link>
        </div>
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
    <div className="space-y-6">
      {!stats.paymentReady && (
        <PaymentSetupBanner organizationId={org.id} />
      )}

      {stats.totalServices === 0 && (
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold tracking-tight">
            Configure seus serviços
          </h2>
          <p className="mt-1 text-sm text-muted">
            Ainda não há serviços e horários definidos — o link público só mostra
            vagas depois que você concluir a configuração.
          </p>
          <Link href="/app/servicos" className="btn-primary mt-4 inline-flex">
            Ir para Serviços
          </Link>
        </div>
      )}

      {stats.paymentReady && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Pagamentos ativos via {paymentProviderLabel(stats.paymentProvider)}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <DashboardStatCard
          title="Agendamentos hoje"
          value={stats.todayCount}
          href="/app/agenda/calendario"
          hrefLabel="Acessar"
          variant="blue"
        />
        <DashboardStatCard
          title="Agendamentos amanhã"
          value={stats.tomorrowCount}
          href="/app/agenda/calendario"
          hrefLabel="Acessar"
          variant="pink"
        />
        <DashboardStatCard
          title="Links ativos"
          value={stats.activePages}
          href="/app/agendador"
          hrefLabel="Agendador"
          variant="orange"
        />
      </div>

      {org.businessMode === "SALON" && (
        <Link
          href="/app/salao"
          className="dashboard-panel flex items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm transition hover:ring-2 hover:ring-foreground/10"
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              Operação do dia
            </p>
            <h2 className="mt-1 text-base font-semibold tracking-tight">
              Gestão à vista
            </h2>
            <p className="mt-1 text-sm text-muted">
              Abra na recepção ou no balcão — equipe na lateral, próximo cliente em
              tempo real. Atualiza sozinho.
            </p>
          </div>
          <span className="btn-primary shrink-0 !text-xs">Abrir painel</span>
        </Link>
      )}

      <DashboardTrendChart
        months={stats.chartMonths}
        maxValue={stats.maxChart}
        totalScheduled={chartTotals.scheduled}
        totalConfirmed={chartTotals.confirmed}
      />

      <DashboardUtilization items={buildUtilizationItems(stats)} />

      {stats.upcoming.length > 0 && (
        <div className="dashboard-panel rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight">
              Próximos agendamentos
            </h2>
            <Link
              href="/app/agenda/listagem"
              className="text-xs font-medium text-[#2563eb] hover:underline"
            >
              Ver todos
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {stats.upcoming.map((b) => {
              const local = toZonedTime(b.startAt, b.timezone);
              return (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{b.customerName}</p>
                    <p className="truncate text-muted">
                      {b.service.title} · {b.bookingPage.title}
                    </p>
                  </div>
                  <p className="shrink-0 text-right text-muted">
                    {format(local, "dd MMM · HH:mm", { locale: ptBR })}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
