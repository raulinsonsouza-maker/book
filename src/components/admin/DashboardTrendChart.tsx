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
  const height = 132;
  const padX = 28;
  const padY = 12;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2 - 14;

  function y(value: number) {
    return padY + chartH - (value / maxValue) * chartH;
  }

  function x(index: number) {
    return padX + (index / Math.max(months.length - 1, 1)) * chartW;
  }

  function line(values: number[]) {
    return values
      .map(
        (v, i) =>
          `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`,
      )
      .join(" ");
  }

  const scheduledLine = line(months.map((m) => m.scheduled));
  const confirmedLine = line(months.map((m) => m.confirmed));

  return (
    <div className="dashboard-panel rounded-xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="text-sm font-semibold tracking-tight">
            Agendamentos vs. confirmados
          </h2>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2563eb]" />
            {totalScheduled}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {totalConfirmed}
          </span>
        </div>
        <span className="text-[11px] font-medium text-muted">12 meses</span>
      </div>

      <div className="mt-3 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="min-w-[420px] h-[132px] w-full"
          role="img"
          aria-label="Gráfico de agendamentos nos últimos 12 meses"
        >
          {[0, 0.5, 1].map((t) => {
            const yy = padY + chartH * (1 - t);
            const val = Math.round(maxValue * t);
            return (
              <g key={t}>
                <line
                  x1={padX}
                  y1={yy}
                  x2={width - padX}
                  y2={yy}
                  stroke="#eef0f3"
                  strokeWidth="1"
                />
                <text x={2} y={yy + 3} fill="#9ca3af" fontSize="9">
                  {val}
                </text>
              </g>
            );
          })}

          <path
            d={scheduledLine}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2"
          />
          <path
            d={confirmedLine}
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
          />

          {months.map((m, i) => (
            <text
              key={m.label}
              x={x(i)}
              y={height - 2}
              textAnchor="middle"
              fill="#9ca3af"
              fontSize="8"
            >
              {m.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
