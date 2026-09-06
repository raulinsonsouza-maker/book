import { formatBRL } from "@/lib/utils";
import { utilizationPercent } from "@/lib/dashboard-stats";

type Item = {
  label: string;
  value: string;
  hint?: string;
  percent: number;
};

type Props = {
  items: Item[];
};

export function DashboardUtilization({ items }: Props) {
  return (
    <div className="dashboard-panel rounded-xl bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold tracking-tight">Neste mês</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="min-w-0">
            <p className="text-[11px] font-medium text-muted">{item.label}</p>
            <p className="mt-0.5 truncate text-lg font-bold tracking-tight">
              {item.value}
            </p>
            {item.hint && (
              <p className="mt-0.5 truncate text-[11px] text-muted">
                {item.hint}
              </p>
            )}
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-[#2563eb]"
                style={{ width: `${item.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function buildUtilizationItems(stats: {
  monthBookings: number;
  monthConfirmed: number;
  monthRevenueCents: number;
  activePages: number;
  totalServices: number;
  integrationsConnected: number;
}) {
  const bookingScale = Math.max(stats.monthBookings, 20);
  const revenueScale = Math.max(stats.monthRevenueCents, 100_000);
  const serviceScale = Math.max(stats.totalServices, 10);

  return [
    {
      label: "Agendamentos",
      value: String(stats.monthBookings),
      hint: `${stats.monthConfirmed} confirmados`,
      percent: utilizationPercent(stats.monthBookings, bookingScale),
    },
    {
      label: "Receita",
      value: formatBRL(stats.monthRevenueCents),
      percent: utilizationPercent(stats.monthRevenueCents, revenueScale),
    },
    {
      label: "Serviços",
      value: String(stats.totalServices),
      hint:
        stats.integrationsConnected > 0
          ? `${stats.integrationsConnected} integração(ões)`
          : undefined,
      percent: utilizationPercent(stats.totalServices, serviceScale),
    },
  ];
}
