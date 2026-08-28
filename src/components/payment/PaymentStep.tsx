"use client";

import { formatBRL } from "@/lib/utils";

type CardState = {
  holderName: string;
  cardNumber: string;
  expMonth: string;
  expYear: string;
  cvv: string;
};

type PaymentStepProps = {
  priceCents: number;
  productTitle: string;
  paymentProviderLabel: string;
  demoPayments: boolean;
  payMethod: "pix" | "card";
  onPayMethodChange: (m: "pix" | "card") => void;
  pixLoading: boolean;
  pixQr: string | null;
  copied: boolean;
  onCopyPix: () => void;
  onDemoConfirm: () => void;
  paying: boolean;
  card: CardState;
  onCardChange: (card: CardState) => void;
  onPayCard: (e: React.FormEvent) => void;
  formatCardNumber: (v: string) => string;
};

export function PaymentStep({
  priceCents,
  productTitle,
  paymentProviderLabel,
  demoPayments,
  payMethod,
  onPayMethodChange,
  pixLoading,
  pixQr,
  copied,
  onCopyPix,
  onDemoConfirm,
  paying,
  card,
  onCardChange,
  onPayCard,
  formatCardNumber,
}: PaymentStepProps) {
  return (
    <div className="space-y-4 animate-in">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Pagamento</h2>
          <p className="mt-1 text-sm text-muted">
            {productTitle} · via {paymentProviderLabel}
          </p>
        </div>
        <p className="text-2xl font-bold tracking-tight">{formatBRL(priceCents)}</p>
      </div>

      {demoPayments && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Modo demo — nenhum valor real será cobrado.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        {(["pix", "card"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onPayMethodChange(m)}
            className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
              payMethod === m
                ? "border-foreground bg-foreground text-white"
                : "border-border bg-white hover:bg-muted-bg"
            }`}
          >
            {m === "pix" ? "Pix" : "Cartão"}
          </button>
        ))}
      </div>

      {payMethod === "pix" && (
        <div className="space-y-3">
          {pixLoading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-foreground" />
              Gerando Pix…
            </div>
          )}
          {pixQr && (
            <div className="space-y-3 rounded-lg border border-border p-4">
              <p className="text-center text-sm font-medium">Escaneie o QR ou copie o código</p>
              <textarea
                readOnly
                className="h-20 w-full rounded-lg border border-border bg-muted-bg p-2 font-mono text-[11px]"
                value={pixQr}
              />
              <button type="button" className="btn-secondary w-full" onClick={onCopyPix}>
                {copied ? "Código copiado!" : "Copiar código Pix"}
              </button>
              {demoPayments && (
                <button
                  type="button"
                  disabled={paying}
                  onClick={onDemoConfirm}
                  className="btn-primary w-full py-3"
                >
                  {paying ? "Confirmando…" : "Simular pagamento (demo)"}
                </button>
              )}
              <p className="text-center text-xs text-muted">
                Aguardando pagamento — atualiza automaticamente
              </p>
            </div>
          )}
        </div>
      )}

      {payMethod === "card" && (
        <form onSubmit={onPayCard} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Nome no cartão</span>
            <input
              required
              className="input-field"
              value={card.holderName}
              onChange={(e) => onCardChange({ ...card, holderName: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Número</span>
            <input
              required
              inputMode="numeric"
              placeholder="0000 0000 0000 0000"
              className="input-field"
              value={card.cardNumber}
              onChange={(e) =>
                onCardChange({ ...card, cardNumber: formatCardNumber(e.target.value) })
              }
            />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Mês</span>
              <input
                required
                placeholder="MM"
                maxLength={2}
                className="input-field"
                value={card.expMonth}
                onChange={(e) =>
                  onCardChange({ ...card, expMonth: e.target.value.replace(/\D/g, "") })
                }
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Ano</span>
              <input
                required
                placeholder="AA"
                maxLength={4}
                className="input-field"
                value={card.expYear}
                onChange={(e) =>
                  onCardChange({ ...card, expYear: e.target.value.replace(/\D/g, "") })
                }
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">CVC</span>
              <input
                required
                maxLength={4}
                className="input-field"
                value={card.cvv}
                onChange={(e) =>
                  onCardChange({ ...card, cvv: e.target.value.replace(/\D/g, "") })
                }
              />
            </label>
          </div>
          <button type="submit" disabled={paying} className="btn-primary w-full py-3">
            {paying ? "Processando…" : `Pagar ${formatBRL(priceCents)}`}
          </button>
        </form>
      )}
    </div>
  );
}
