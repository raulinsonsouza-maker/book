"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  organizationId: string;
};

/**
 * Opcional — o agendamento funciona sem provedor conectado.
 */
export function PaymentSetupBanner({ organizationId: _organizationId }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="dashboard-panel flex flex-col gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold tracking-tight">
          Receba pagamentos online
        </p>
        <p className="mt-1 text-sm text-muted">
          Conecte Mercado Pago ou Asaas para cobrar no momento da reserva.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="btn-secondary"
        >
          Agora não
        </button>
        <Link href="/app/integracoes" className="btn-primary">
          Configurar integrações
        </Link>
      </div>
    </div>
  );
}
