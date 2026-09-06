"use client";

import { AsaasIcon } from "@/components/icons/AsaasIcon";
import { MercadoPagoIcon } from "@/components/icons/MercadoPagoIcon";
import { ASAAS_ENABLED } from "@/lib/feature-flags";

type Props = {
  mpConnected: boolean;
  asaasConnected: boolean;
  asaasKey: string;
  connectingMp: boolean;
  saving: boolean;
  onAsaasKeyChange: (v: string) => void;
  onConnectMp: () => void;
  onConnectAsaas: () => void;
  onSkipPayment: () => void;
};

export function PagamentoStep({
  mpConnected,
  asaasConnected,
  asaasKey,
  connectingMp,
  saving,
  onAsaasKeyChange,
  onConnectMp,
  onConnectAsaas,
  onSkipPayment,
}: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="onboard-title text-2xl sm:text-[1.85rem]">
          Receber pagamentos
        </h1>
        <p className="onboard-lead mt-2">
          Conecte agora ou deixe para depois — você pode configurar no painel.
        </p>
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl border border-border p-4">
          <div className="flex items-center gap-3">
            <MercadoPagoIcon size={32} />
            <div className="flex-1">
              <p className="font-semibold">Mercado Pago</p>
              <p className="text-xs text-muted">
                Pix e cartão · conecte em um clique
              </p>
            </div>
            {mpConnected ? (
              <span className="text-xs font-semibold text-emerald-700">
                Conectado
              </span>
            ) : (
              <button
                type="button"
                disabled={connectingMp}
                onClick={onConnectMp}
                className="btn-primary !py-2 !text-xs"
              >
                {connectingMp ? "Abrindo…" : "Conectar"}
              </button>
            )}
          </div>
        </div>

        {ASAAS_ENABLED && (
          <div className="rounded-2xl border border-border p-4">
            <div className="flex items-start gap-3">
              <AsaasIcon size={32} />
              <div className="flex-1 space-y-2">
                <div>
                  <p className="font-semibold">Asaas</p>
                  <p className="text-xs text-muted">
                    Pix e cartão · cole a API Key
                  </p>
                </div>
                {asaasConnected ? (
                  <span className="text-xs font-semibold text-emerald-700">
                    Conectado
                  </span>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      className="input-field flex-1 font-mono text-xs"
                      placeholder="API Key Asaas"
                      value={asaasKey}
                      onChange={(e) => onAsaasKeyChange(e.target.value)}
                    />
                    <button
                      type="button"
                      disabled={saving}
                      onClick={onConnectAsaas}
                      className="btn-secondary whitespace-nowrap"
                    >
                      Salvar key
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={saving}
          onClick={onSkipPayment}
          className="onboard-choice w-full"
        >
          <p className="font-semibold">Configurar depois</p>
          <p className="onboard-choice-desc mt-1 text-xs text-[var(--lp-steel)]">
            Pule esta etapa e conecte o pagamento quando quiser, no painel.
          </p>
        </button>
      </div>
    </div>
  );
}
