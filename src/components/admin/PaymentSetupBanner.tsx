"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  organizationId: string;
};

/**
 * Visível enquanto o painel indica que não há provedor pronto.
 * "Agora não" só esconde na sessão atual; volta na próxima visita.
 */
export function PaymentSetupBanner({ organizationId: _organizationId }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="dashboard-panel flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold tracking-tight text-amber-950">
          Conecte um provedor de pagamento
        </p>
        <p className="mt-1 text-sm text-amber-900/80">
          Sem Mercado Pago ou Asaas, o checkout público fica em modo demo — nenhum
          valor real é cobrado.
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
        <Link href="/app/integrations" className="btn-primary">
          Configurar integrações
        </Link>
      </div>
    </div>
  );
}
