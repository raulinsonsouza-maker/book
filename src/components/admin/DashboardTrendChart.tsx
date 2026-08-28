type Point = {
  label: string;
  scheduled: number;
  confirmed: number;
};

type Props = {
  months: Point[];
  maxValue: number;
  totalScheduled: number;
  totalConfirmed: number;
};

export function DashboardTrendChart({
  months,
  maxValue,
  totalScheduled,
  totalConfirmed,
}: Props) {
  const width = 640;
  const height = 220;
  const padX = 36;
  const padY = 24;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  function y(value: number) {
    return padY + chartH - (value / maxValue) * chartH;
  }

  function x(index: number) {
    return padX + (index / Math.max(months.length - 1, 1)) * chartW;
  }

  function line(values: number[]) {
    return values
      .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
      .join(" ");
  }

  const scheduledLine = line(months.map((m) => m.scheduled));
  const confirmedLine = line(months.map((m) => m.confirmed));

  return (
    <div className="dashboard-panel rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            Agendamentos vs. Confirmados
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Volume agendado x efetivamente confirmado
          </p>
        </div>
        <span className="rounded-lg border border-border bg-muted-bg px-3 py-1.5 text-xs font-medium text-muted">
          Últimos 12 meses
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#2563eb]" />
          Agendamentos {totalScheduled}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Confirmados {totalConfirmed}
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="min-w-[520px] w-full"
          role="img"
          aria-label="Gráfico de agendamentos nos últimos 12 meses"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const yy = padY + chartH * (1 - t);
            const val = Math.round(maxValue * t);
            return (
              <g key={t}>
                <line
                  x1={padX}
                  y1={yy}
                  x2={width - padX}
                  y2={yy}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text x={4} y={yy + 4} fill="#9ca3af" fontSize="10">
                  {val}
                </text>
              </g>
            );
          })}

          <path d={scheduledLine} fill="none" stroke="#2563eb" strokeWidth="2.5" />
          <path d={confirmedLine} fill="none" stroke="#10b981" strokeWidth="2.5" />

          {months.map((m, i) => (
            <text
              key={m.label}
              x={x(i)}
              y={height - 4}
              textAnchor="middle"
              fill="#9ca3af"
              fontSize="9"
            >
              {m.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
