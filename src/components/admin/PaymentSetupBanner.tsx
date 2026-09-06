import Link from "next/link";

type Props = {
  organizationId: string;
};

/**
 * Opcional — o agendamento funciona sem provedor conectado.
 */
export function PaymentSetupBanner({ organizationId: _organizationId }: Props) {
  return (
    <div className="dashboard-panel flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 shadow-sm">
      <p className="min-w-0 flex-1 text-sm text-foreground">
        <span className="font-semibold">Pagamentos online</span>
        <span className="text-muted">
          {" "}
          · conecte Mercado Pago ou Asaas
        </span>
      </p>
      <Link
        href="/app/integracoes"
        className="btn-primary shrink-0 !px-3 !py-1.5 !text-xs"
      >
        Configurar
      </Link>
    </div>
  );
}
