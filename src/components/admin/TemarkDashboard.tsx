import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import type { getDashboardStats } from "@/lib/dashboard-stats";
import {
  NavIconCalendar,
  NavIconIntegrations,
  NavIconPages,
  NavIconServices,
} from "@/components/admin/NavIcons";

type Stats = Awaited<ReturnType<typeof getDashboardStats>>;

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function Rays({ className }: { className?: string }) {
  return (
    <span className={`tm-rays ${className ?? ""}`} aria-hidden>
      <i />
      <i />
      <i />
    </span>
  );
}

function WaveHand() {
  return (
    <svg className="tm-wave-hand" viewBox="0 0 340 170" aria-hidden>
      <defs>
        <linearGradient id="tm-hand-gradient" x1="0" y1="0" x2="1" y2=".8">
          <stop stopColor="#ffc52f" />
          <stop offset=".52" stopColor="#ffd54f" />
          <stop offset="1" stopColor="#ffe5a0" stopOpacity=".55" />
        </linearGradient>
      </defs>
      <path
        d="M62 88C49 81 43 66 41 53L36 28C34 21 43 18 46 25L51 42L46 15C44 6 54 4 56 13L61 39L58 9C57 0 68-1 69 8L72 38L73 14C73 5 83 6 83 15L83 49L95 35C100 28 109 34 105 41L94 64C92 69 89 73 86 77C97 113 130 133 176 136C220 139 259 127 303 105L320 130C263 160 219 172 166 165C108 160 77 132 62 88Z"
        fill="url(#tm-hand-gradient)"
        stroke="none"
      />
      <g fill="none" stroke="#989c98" strokeWidth="1.7" strokeLinecap="round">
        <path d="M26 38C22 46 23 56 29 64M16 42C12 52 15 63 22 71M112 19C118 26 119 35 116 44M121 14C128 24 130 35 126 46" />
      </g>
    </svg>
  );
}

function TrendChart({
  months,
  maxValue,
}: {
  months: Stats["chartMonths"];
  maxValue: number;
}) {
  const width = 800;
  const height = 214;
  const padX = 24;
  const padY = 18;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2 - 24;

  function x(i: number) {
    return padX + (i / Math.max(months.length - 1, 1)) * chartW;
  }
  function y(v: number) {
    return padY + chartH - (v / Math.max(maxValue, 1)) * chartH;
  }
  function path(values: number[]) {
    return values
      .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
      .join(" ");
  }

  const scheduled = months.map((m) => m.scheduled);
  const confirmed = months.map((m) => m.confirmed);

  return (
    <svg
      className="tm-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Agendamentos e confirmações nos últimos 12 meses"
    >
      {[0, 0.5, 1].map((t) => {
        const yy = padY + chartH * (1 - t);
        return (
          <line
            key={t}
            x1={padX}
            y1={yy}
            x2={width - padX}
            y2={yy}
            stroke="#eeece8"
            strokeWidth="1"
          />
        );
      })}
      <path
        d={path(scheduled)}
        fill="none"
        stroke="#ffbd1f"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={path(confirmed)}
        fill="none"
        stroke="#101820"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {months.map((m, i) => (
        <text
          key={m.label}
          x={x(i)}
          y={height - 4}
          textAnchor="middle"
          fontSize="11"
          fill="#75808f"
        >
          {m.label.replace("/20", "/").slice(0, 3)}
        </text>
      ))}
    </svg>
  );
}

export function TemarkDashboard({
  stats,
  userName,
  businessMode,
}: {
  stats: Stats;
  userName?: string | null;
  businessMode?: string | null;
}) {
  const firstName =
    userName?.trim().split(/\s+/)[0] ||
    "por aí";

  return (
    <div className="tm-dash">
      <header className="tm-dash-header">
        <div className="tm-welcome">
          <span className="tm-eyebrow">Painel</span>
          <h1>
            Olá, {firstName}!
            <Rays className="tm-greeting-rays" />
          </h1>
          <p>Aqui está o resumo da sua agenda e dos seus pagamentos.</p>
        </div>

        {!stats.paymentReady ? (
          <div className="tm-integration-banner">
            <WaveHand />
            <div className="tm-banner-copy">
              <h2>Pagamentos online</h2>
              <p>
                Conecte Mercado Pago ou Asaas para
                <br className="tm-wide-only" /> receber pagamentos automaticamente.
              </p>
            </div>
            <Link href="/app/integracoes" className="tm-btn tm-btn-dark">
              Configurar integrações
              <span aria-hidden>→</span>
            </Link>
          </div>
        ) : (
          <div className="tm-integration-banner tm-integration-banner-ready">
            <WaveHand />
            <div className="tm-banner-copy">
              <h2>Pagamentos ativos</h2>
              <p>
                Seu checkout está pronto.
                {businessMode === "SALON" ? " Acompanhe a equipe na gestão à vista." : ""}
              </p>
            </div>
            {businessMode === "SALON" ? (
              <Link href="/app/salao" className="tm-btn tm-btn-dark">
                Gestão à vista
                <span aria-hidden>→</span>
              </Link>
            ) : (
              <Link href="/app/financeiro" className="tm-btn tm-btn-dark">
                Ver financeiro
                <span aria-hidden>→</span>
              </Link>
            )}
          </div>
        )}
      </header>

      <div className="tm-stat-grid">
        <Link href="/app/agenda/calendario" className="tm-stat-card tm-stat-today">
          <span className="tm-stat-icon">
            <NavIconCalendar />
          </span>
          <div>
            <span className="tm-stat-title">Hoje</span>
            <div className="tm-stat-number">
              <strong>{stats.todayCount}</strong>
              <span>agendamentos</span>
            </div>
          </div>
          <span className="tm-round-arrow" aria-hidden>
            →
          </span>
        </Link>

        <Link href="/app/agenda/calendario" className="tm-stat-card tm-stat-tomorrow">
          <span className="tm-stat-icon">
            <NavIconCalendar />
          </span>
          <div>
            <span className="tm-stat-title">Amanhã</span>
            <div className="tm-stat-number">
              <strong>{stats.tomorrowCount}</strong>
              <span>agendamentos</span>
            </div>
          </div>
          <span className="tm-round-arrow" aria-hidden>
            →
          </span>
        </Link>

        <Link href="/app/agendador" className="tm-stat-card tm-stat-links">
          <span className="tm-stat-icon">
            <NavIconIntegrations />
          </span>
          <div>
            <span className="tm-stat-title">Links</span>
            <div className="tm-stat-number">
              <strong>{stats.activePages}</strong>
              <span>{stats.activePages === 1 ? "link ativo" : "links ativos"}</span>
            </div>
          </div>
          <span className="tm-round-arrow" aria-hidden>
            →
          </span>
          <span className="tm-blue-marks" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        </Link>
      </div>

      <div className="tm-overview-grid">
        <section className="tm-panel tm-chart-panel">
          <div className="tm-panel-heading">
            <h2>Agendamentos vs. confirmados</h2>
            <div className="tm-chart-legend">
              <span className="tm-legend-item">
                <i className="tm-yellow-dot" />
                Agendamentos
              </span>
              <span className="tm-legend-item">
                <i className="tm-black-dot" />
                Confirmados
              </span>
            </div>
            <span className="tm-period">Últimos 12 meses</span>
          </div>
          <div className="tm-chart-wrap">
            <TrendChart months={stats.chartMonths} maxValue={stats.maxChart} />
          </div>
        </section>

        <section className="tm-panel tm-upcoming-panel">
          <div className="tm-panel-heading">
            <h2>Próximos</h2>
            <Link href="/app/agenda/listagem" className="tm-text-link">
              Ver todos <span aria-hidden>→</span>
            </Link>
          </div>
          {stats.upcoming.length === 0 ? (
            <div className="tm-upcoming-empty">
              <span className="tm-empty-icon">
                <NavIconCalendar />
                <Rays />
              </span>
              <p className="tm-empty-title">Nada confirmado por enquanto</p>
              <p className="tm-empty-description">
                Quando houver agendamentos, eles aparecem aqui.
              </p>
              <Link href="/app/agenda/calendario" className="tm-empty-add">
                Abrir calendário
              </Link>
            </div>
          ) : (
            <ul className="tm-upcoming-list">
              {stats.upcoming.slice(0, 5).map((b) => {
                const local = toZonedTime(b.startAt, b.timezone);
                return (
                  <li key={b.id} className="tm-appointment-row">
                    <span className="tm-avatar">
                      {b.customerName.trim().slice(0, 2).toUpperCase()}
                    </span>
                    <div className="tm-appointment-details">
                      <strong>{b.customerName}</strong>
                      <span>{b.service.title}</span>
                    </div>
                    <span className="tm-appointment-time">
                      {format(local, "dd MMM · HH:mm", { locale: ptBR })}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="tm-panel tm-monthly-panel">
        <h2>Neste mês</h2>
        <div className="tm-monthly-grid">
          <div className="tm-month-stat">
            <span className="tm-month-icon tm-month-yellow">
              <NavIconCalendar />
            </span>
            <div>
              <span className="tm-metric-label">Agendamentos</span>
              <div className="tm-month-value">
                <strong>{stats.monthBookings}</strong>
              </div>
              <p>{stats.monthConfirmed} confirmados</p>
            </div>
          </div>
          <div className="tm-month-stat">
            <span className="tm-month-icon tm-month-green">$</span>
            <div>
              <span className="tm-metric-label">Receita</span>
              <div className="tm-month-value">
                <strong>{money(stats.monthRevenueCents)}</strong>
              </div>
              <p>pagamentos confirmados</p>
            </div>
          </div>
          <Link href="/app/servicos" className="tm-month-stat">
            <span className="tm-month-icon tm-month-purple">
              <NavIconServices />
            </span>
            <div>
              <span className="tm-metric-label">Serviços</span>
              <div className="tm-month-value">
                <strong>{stats.totalServices}</strong>
              </div>
              <p>ativos</p>
            </div>
          </Link>
        </div>
      </section>

      {stats.totalServices === 0 && (
        <div className="tm-panel tm-setup-hint">
          <div>
            <h3>Configure os serviços</h3>
            <p>Libere horários no seu link de agendamento.</p>
          </div>
          <Link href="/app/servicos" className="tm-btn tm-btn-yellow">
            <NavIconPages />
            Serviços
          </Link>
        </div>
      )}

      <svg className="tm-bottom-ribbon" viewBox="0 0 350 450" aria-hidden>
        <path
          d="M300 480C390 200 370 120 110 110S-50-70 180-40"
          fill="none"
          stroke="currentColor"
          strokeWidth="44"
        />
      </svg>
    </div>
  );
}
