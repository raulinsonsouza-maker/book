"use client";

import Link from "next/link";

type Props = {
  publicPath: string;
  serviceCount: number;
  businessMode: "SOLO" | "SALON";
  proCount: number;
  mpConnected: boolean;
  asaasConnected: boolean;
};

export function ProntoStep({
  publicPath,
  serviceCount,
  businessMode,
  proCount,
  mpConnected,
  asaasConnected,
}: Props) {
  return (
    <div className="space-y-6 text-center">
      <div className="onboard-success-badge" aria-hidden>
        <span>★</span>
      </div>
      <div>
        <h1 className="onboard-title text-2xl sm:text-[1.85rem]">
          Agora é só explorar!
        </h1>
        <p className="onboard-lead mx-auto mt-3 max-w-md text-center">
          Seus recursos estão prontos
          {serviceCount > 0 ? ` com ${serviceCount} serviço(s)` : ""}
          {businessMode === "SALON" && proCount > 0
            ? ` e ${proCount} profissional(is)`
            : ""}
          . Teste tudo no painel e compartilhe seu link com clientes.
        </p>
      </div>

      {publicPath && (
        <div className="rounded-2xl border border-border bg-muted-bg/50 p-4 text-left text-sm">
          <p className="text-xs font-medium text-muted">Link público</p>
          <a
            href={publicPath}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block break-all font-medium underline-offset-2 hover:underline"
          >
            {publicPath}
          </a>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link href="/app" className="btn-primary onboard-cta-gradient">
          Entrar na plataforma
        </Link>
        {!mpConnected && !asaasConnected && (
          <Link href="/app/integracoes" className="btn-secondary">
            Conectar pagamento
          </Link>
        )}
      </div>
    </div>
  );
}
