"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatBRL } from "@/lib/utils";

export type FinanceSeries = {
  byDay: { date: string; amountCents: number }[];
  byMethod: { method: string; amountCents: number; count: number }[];
  byStatus: { status: string; amountCents: number; count: number }[];
};

const METHOD_LABEL: Record<string, string> = {
  PIX: "PIX",
  CARD: "Cartão",
};

const STATUS_LABEL: Record<string, string> = {
  PAID: "Pago",
  PENDING: "Pendente",
  FAILED: "Falhou",
  REFUNDED: "Estornado",
};

const STATUS_COLOR: Record<string, string> = {
  PAID: "#059669",
  PENDING: "#d97706",
  FAILED: "#dc2626",
  REFUNDED: "#6b7280",
};

const METHOD_COLOR: Record<string, string> = {
  PIX: "#0c1222",
  CARD: "#2563eb",
};

type Props = {
  series: FinanceSeries;
};

export function FinanceiroCharts({ series }: Props) {
  const maxDay = Math.max(1, ...series.byDay.map((d) => d.amountCents));
  const methodTotal = series.byMethod.reduce((s, m) => s + m.amountCents, 0);
  const statusTotal = series.byStatus.reduce((s, m) => s + m.count, 0);

  const width = 640;
  const height = 200;
  const padX = 12;
  const padY = 16;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2 - 20;
  const barGap = series.byDay.length > 20 ? 1 : 4;
  const barW =
    series.byDay.length > 0
      ? Math.max(3, (chartW - barGap * (series.byDay.length - 1)) / series.byDay.length)
      : 8;

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="surface overflow-hidden lg:col-span-3">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              Receita no período
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Valores pagos por dia
            </p>
          </div>
          {series.byDay.some((d) => d.amountCents > 0) && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              {formatBRL(
                series.byDay.reduce((s, d) => s + d.amountCents, 0),
              )}
            </span>
          )}
        </div>
        <div className="px-3 pb-3 pt-2">
          {!series.byDay.some((d) => d.amountCents > 0) ? (
            <p className="px-2 py-10 text-center text-sm text-muted">
              Sem pagamentos confirmados neste período.
            </p>
          ) : (
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="h-48 w-full"
              role="img"
              aria-label="Receita diária no período"
            >
              {[0.25, 0.5, 0.75, 1].map((t) => {
                const yy = padY + chartH * (1 - t);
                return (
                  <line
                    key={t}
                    x1={padX}
                    y1={yy}
                    x2={width - padX}
                    y2={yy}
                    stroke="#eef0f3"
                    strokeWidth="1"
                  />
                );
              })}
              {series.byDay.map((d, i) => {
                const h = (d.amountCents / maxDay) * chartH;
                const x = padX + i * (barW + barGap);
                const y = padY + chartH - h;
                const showLabel =
                  series.byDay.length <= 14 ||
                  i === 0 ||
                  i === series.byDay.length - 1 ||
                  i % Math.ceil(series.byDay.length / 6) === 0;
                return (
                  <g key={d.date}>
                    {d.amountCents > 0 && (
                      <rect
                        x={x}
                        y={y}
                        width={barW}
                        height={Math.max(h, 2)}
                        rx={Math.min(4, barW / 2)}
                        fill="#0c1222"
                        opacity={0.85}
                      >
                        <title>
                          {format(parseISO(d.date), "dd MMM yyyy", {
                            locale: ptBR,
                          })}
                          : {formatBRL(d.amountCents)}
                        </title>
                      </rect>
                    )}
                    {showLabel && (
                      <text
                        x={x + barW / 2}
                        y={height - 4}
                        textAnchor="middle"
                        fill="#9ca3af"
                        fontSize="9"
                      >
                        {format(parseISO(d.date), "dd/MM")}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-1">
        <div className="surface p-5">
          <h2 className="text-sm font-semibold tracking-tight">Por método</h2>
          <p className="mt-0.5 text-xs text-muted">Distribuição do valor</p>
          {series.byMethod.length === 0 ? (
            <p className="mt-6 text-sm text-muted">Sem dados</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {series.byMethod.map((m) => {
                const pct =
                  methodTotal > 0
                    ? Math.round((m.amountCents / methodTotal) * 100)
                    : 0;
                return (
                  <li key={m.method}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-medium">
                        {METHOD_LABEL[m.method] || m.method}
                        <span className="ml-1.5 text-muted">
                          · {m.count}
                        </span>
                      </span>
                      <span className="font-semibold tabular-nums">
                        {formatBRL(m.amountCents)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted-bg">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background:
                            METHOD_COLOR[m.method] || "#0c1222",
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="surface p-5">
          <h2 className="text-sm font-semibold tracking-tight">Por status</h2>
          <p className="mt-0.5 text-xs text-muted">Quantidade no filtro</p>
          {series.byStatus.length === 0 ? (
            <p className="mt-6 text-sm text-muted">Sem dados</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {series.byStatus.map((s) => {
                const pct =
                  statusTotal > 0
                    ? Math.round((s.count / statusTotal) * 100)
                    : 0;
                return (
                  <li key={s.status}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-2 font-medium">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            background: STATUS_COLOR[s.status] || "#6b7280",
                          }}
                        />
                        {STATUS_LABEL[s.status] || s.status}
                      </span>
                      <span className="tabular-nums text-muted">
                        {s.count} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted-bg">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: STATUS_COLOR[s.status] || "#6b7280",
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
