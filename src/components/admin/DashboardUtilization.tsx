import { formatBRL } from "@/lib/utils";
import { utilizationPercent } from "@/lib/dashboard-stats";

type Item = {
  label: string;
  value: string;
  sublabel?: string;
  percent: number;
};

type Props = {
  items: Item[];
};

export function DashboardUtilization({ items }: Props) {
  return (
    <div className="dashboard-panel rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-base font-semibold tracking-tight">Resumo do mês</h2>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
          Ativo
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-border bg-muted-bg/30 p-4"
          >
            <p className="text-xs font-medium text-muted">{item.label}</p>
            <p className="mt-1 text-lg font-bold tracking-tight">{item.value}</p>
            {item.sublabel && (
              <p className="mt-0.5 text-[11px] text-muted">{item.sublabel}</p>
            )}
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-[#2563eb] transition-all"
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
  const confirmScale = Math.max(stats.monthConfirmed, 10);
  const revenueScale = Math.max(stats.monthRevenueCents, 100_000);
  const pageScale = Math.max(stats.activePages, 5);
  const serviceScale = Math.max(stats.totalServices, 10);

  return [
    {
      label: "Agendamentos / mês",
      value: String(stats.monthBookings),
      sublabel: `${stats.monthConfirmed} confirmados`,
      percent: utilizationPercent(stats.monthBookings, bookingScale),
    },
    {
      label: "Receita confirmada",
      value: formatBRL(stats.monthRevenueCents),
      sublabel: "Pagamentos recebidos",
      percent: utilizationPercent(stats.monthRevenueCents, revenueScale),
    },
    {
      label: "Páginas ativas",
      value: String(stats.activePages),
      sublabel: "Links públicos de agendamento",
      percent: utilizationPercent(stats.activePages, pageScale),
    },
    {
      label: "Serviços cadastrados",
      value: String(stats.totalServices),
      sublabel: `${stats.integrationsConnected} integração(ões) ativa(s)`,
      percent: utilizationPercent(stats.totalServices, serviceScale),
    },
  ];
}
