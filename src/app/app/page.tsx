import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { requireOrg } from "@/lib/session";
import { getDashboardStats } from "@/lib/dashboard-stats";
import { paymentProviderLabel } from "@/lib/payments/resolve-provider";
import { DashboardStatCard } from "@/components/admin/DashboardStatCard";
import { DashboardTrendChart } from "@/components/admin/DashboardTrendChart";
import {
  DashboardUtilization,
  buildUtilizationItems,
} from "@/components/admin/DashboardUtilization";
import { DashboardPagesList } from "@/components/admin/DashboardPagesList";

export default async function AppHomePage() {
  const { org } = await requireOrg();
  const stats = await getDashboardStats(org.id, org.timezone);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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
        <div className="dashboard-panel flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-tight">
              Conecte um provedor de pagamento
            </p>
            <p className="mt-1 text-sm text-muted">
              Conecte o Mercado Pago — sem isso, o checkout fica em modo demo.
            </p>
          </div>
          <Link href="/app/integrations" className="btn-primary shrink-0">
            Configurar integrações
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
          title="Páginas ativas"
          value={stats.activePages}
          href="/app/pages"
          hrefLabel="Saiba mais"
          variant="orange"
        />
      </div>

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

      <DashboardPagesList pages={stats.pages} appUrl={appUrl} />
    </div>
  );
}
