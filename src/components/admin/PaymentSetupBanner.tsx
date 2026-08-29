"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const storageKey = (orgId: string) => `book.paymentSetupNudge.${orgId}`;

type Props = {
  organizationId: string;
};

/** Mostra só na primeira visita ao painel (sem provedor). Depois some. */
export function PaymentSetupBanner({ organizationId }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey(organizationId))) return;
      setVisible(true);
      localStorage.setItem(storageKey(organizationId), "1");
    } catch {
      setVisible(true);
    }
  }, [organizationId]);

  if (!visible) return null;

  function dismiss() {
    try {
      localStorage.setItem(storageKey(organizationId), "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  return (
    <div className="dashboard-panel flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold tracking-tight">
          Conecte um provedor de pagamento
        </p>
        <p className="mt-1 text-sm text-muted">
          Conecte Mercado Pago ou Asaas — sem isso, o checkout fica em modo demo.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button type="button" onClick={dismiss} className="btn-secondary">
          Agora não
        </button>
        <Link
          href="/app/integrations"
          className="btn-primary"
          onClick={dismiss}
        >
          Configurar integrações
        </Link>
      </div>
    </div>
  );
}
