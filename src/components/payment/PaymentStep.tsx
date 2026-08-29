"use client";

import { formatBRL } from "@/lib/utils";
import { PixQrImage } from "@/components/payment/PixQrImage";

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
  pixQrBase64?: string | null;
  copied: boolean;
  onCopyPix: () => void;
  onDemoConfirm: () => void;
  onCheckPix?: () => void;
  checkingPix?: boolean;
  pixCheckHint?: string;
  paying: boolean;
  card: CardState;
  onCardChange: (card: CardState) => void;
  onPayCard: (e: React.FormEvent) => void;
  formatCardNumber: (v: string) => string;
  holdExpiresAt?: string | null;
  holdCountdown?: string;
  installments?: number;
  onInstallmentsChange?: (n: number) => void;
  cardMaxInstallments?: number;
  showInstallments?: boolean;
  awaitingCardConfirm?: boolean;
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
  pixQrBase64,
  copied,
  onCopyPix,
  onDemoConfirm,
  onCheckPix,
  checkingPix = false,
  pixCheckHint = "",
  paying,
  card,
  onCardChange,
  onPayCard,
  formatCardNumber,
  holdExpiresAt,
  holdCountdown = "",
  installments = 1,
  onInstallmentsChange,
  cardMaxInstallments = 12,
  showInstallments = false,
  awaitingCardConfirm = false,
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

      {holdExpiresAt && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <p className="font-semibold">
            Reserva temporária
            {holdCountdown ? ` · ${holdCountdown}` : ""}
          </p>
          <p className="mt-0.5 text-xs text-amber-900/80">
            Conclua o pagamento antes do tempo acabar.
          </p>
        </div>
      )}

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
              <PixQrImage payload={pixQr} base64={pixQrBase64} />
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
              {onCheckPix && (
                <button
                  type="button"
                  disabled={checkingPix}
                  onClick={onCheckPix}
                  className="btn-primary w-full py-3"
                >
                  {checkingPix
                    ? "Verificando…"
                    : "Já paguei — verificar agora"}
                </button>
              )}
              <p className="text-center text-xs text-muted">
                {pixCheckHint ||
                  "A tela atualiza sozinha a cada poucos segundos após o Pix. Se demorar, use o botão acima."}
              </p>
            </div>
          )}
        </div>
      )}

      {payMethod === "card" && (
        <form onSubmit={onPayCard} className="space-y-3">
          {awaitingCardConfirm && (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <p className="font-medium">Pagamento em análise</p>
              <p className="text-xs text-amber-900/80">
                {pixCheckHint ||
                  "Aguardando confirmação do cartão. A tela atualiza sozinha."}
              </p>
              {onCheckPix && (
                <button
                  type="button"
                  disabled={checkingPix}
                  onClick={onCheckPix}
                  className="btn-primary w-full py-2.5"
                >
                  {checkingPix
                    ? "Verificando…"
                    : "Já paguei — verificar agora"}
                </button>
              )}
            </div>
          )}
          {showInstallments &&
            cardMaxInstallments > 0 &&
            onInstallmentsChange &&
            !awaitingCardConfirm && (
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">Parcelas</span>
                <select
                  className="input-field"
                  value={Math.min(installments, cardMaxInstallments)}
                  onChange={(e) =>
                    onInstallmentsChange(Number(e.target.value) || 1)
                  }
                >
                  {Array.from({ length: cardMaxInstallments }, (_, i) => i + 1).map(
                    (n) => (
                      <option key={n} value={n}>
                        {n === 1
                          ? `À vista — ${formatBRL(priceCents)}`
                          : `${n}x de ${formatBRL(Math.ceil(priceCents / n))}`}
                      </option>
                    ),
                  )}
                </select>
              </label>
            )}
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Nome no cartão</span>
            <input
              required
              className="input-field"
              value={card.holderName}
              onChange={(e) => onCardChange({ ...card, holderName: e.target.value })}
              disabled={awaitingCardConfirm}
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
              disabled={awaitingCardConfirm}
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
                disabled={awaitingCardConfirm}
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
                disabled={awaitingCardConfirm}
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
                disabled={awaitingCardConfirm}
                onChange={(e) =>
                  onCardChange({ ...card, cvv: e.target.value.replace(/\D/g, "") })
                }
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={paying || awaitingCardConfirm}
            className="btn-primary w-full py-3"
          >
            {paying
              ? "Processando…"
              : awaitingCardConfirm
                ? "Aguardando confirmação…"
                : `Pagar ${formatBRL(priceCents)}`}
          </button>
        </form>
      )}
    </div>
  );
}
