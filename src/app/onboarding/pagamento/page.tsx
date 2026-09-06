"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { PaymentStep } from "@/components/payment/PaymentStep";
import { formatCpf, isValidCpf } from "@/lib/utils";

type PlanInfo = {
  name: string;
  slug: string;
  priceCents: number;
  interval: string;
};

function formatCardNumber(v: string) {
  return v
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ")
    .trim();
}

declare global {
  interface Window {
    MercadoPago?: new (
      key: string,
      options?: { locale?: string },
    ) => {
      createCardToken: (data: Record<string, string>) => Promise<{
        id: string;
      }>;
    };
  }
}

export default function OnboardingPagamentoPage() {
  const router = useRouter();
  const { status, update } = useSession();
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payMethod, setPayMethod] = useState<"pix" | "card">("pix");
  const [pixLoading, setPixLoading] = useState(false);
  const [pixQr, setPixQr] = useState<string | null>(null);
  const [pixQrBase64, setPixQrBase64] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paying, setPaying] = useState(false);
  const [checking, setChecking] = useState(false);
  const [awaitingCard, setAwaitingCard] = useState(false);
  const [cpf, setCpf] = useState("");
  const [installments, setInstallments] = useState(1);
  const [card, setCard] = useState({
    holderName: "",
    cardNumber: "",
    expMonth: "",
    expYear: "",
    cvv: "",
  });

  const goApp = useCallback(async () => {
    await update();
    window.location.assign("/app");
  }, [update]);

  const loadSession = useCallback(async () => {
    const res = await fetch("/api/onboarding/checkout/pay");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Não foi possível carregar o pagamento");
      setLoading(false);
      return;
    }
    if (data.paid || data.status === "ACTIVE") {
      await goApp();
      return;
    }
    if (data.plan) setPlan(data.plan);
    if (data.publicKey) setPublicKey(data.publicKey);
    setLoading(false);
  }, [goApp]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/onboarding/pagamento");
      return;
    }
    if (status === "authenticated") void loadSession();
  }, [status, router, loadSession]);

  useEffect(() => {
    if (!paymentId || !pixQr && !awaitingCard) return;
    let cancelled = false;
    async function poll() {
      const res = await fetch(
        `/api/onboarding/checkout/pay?paymentId=${paymentId}`,
      );
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (data.paid || data.status === "ACTIVE") {
        await goApp();
        return;
      }
      window.setTimeout(poll, 3500);
    }
    const t = window.setTimeout(poll, 3500);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [paymentId, pixQr, awaitingCard, goApp]);

  async function ensureMpSdk() {
    if (window.MercadoPago) return;
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://sdk.mercadopago.com/js/v2";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("SDK Mercado Pago"));
      document.body.appendChild(s);
    });
  }

  async function startPix() {
    setError("");
    setPixLoading(true);
    setPixQr(null);
    setPixQrBase64(null);
    try {
      const res = await fetch("/api/onboarding/checkout/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "pix" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Não foi possível gerar o Pix");
        return;
      }
      if (data.paid) {
        await goApp();
        return;
      }
      setPaymentId(data.paymentId || null);
      setPixQr(data.qrCode || null);
      setPixQrBase64(data.qrCodeBase64 || null);
    } finally {
      setPixLoading(false);
    }
  }

  useEffect(() => {
    if (payMethod === "pix" && !pixQr && !pixLoading && plan && !loading) {
      void startPix();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payMethod, plan, loading]);

  async function checkPaid() {
    if (!paymentId) return;
    setChecking(true);
    setError("");
    try {
      const res = await fetch(
        `/api/onboarding/checkout/pay?paymentId=${paymentId}`,
      );
      const data = await res.json().catch(() => ({}));
      if (data.paid || data.status === "ACTIVE") {
        await goApp();
        return;
      }
      setError("Pagamento ainda não confirmado. Aguarde alguns segundos.");
    } finally {
      setChecking(false);
    }
  }

  async function onPayCard(e: FormEvent) {
    e.preventDefault();
    if (!publicKey) {
      setError("Chave pública do Mercado Pago ausente");
      return;
    }
    const digits = cpf.replace(/\D/g, "");
    if (!isValidCpf(digits)) {
      setError("Informe um CPF válido");
      return;
    }

    setPaying(true);
    setError("");
    try {
      await ensureMpSdk();
      if (!window.MercadoPago) throw new Error("SDK indisponível");
      const mp = new window.MercadoPago(publicKey);
      const tokenized = await mp.createCardToken({
        cardNumber: card.cardNumber.replace(/\D/g, ""),
        cardholderName: card.holderName,
        cardExpirationMonth: card.expMonth.padStart(2, "0"),
        cardExpirationYear:
          card.expYear.length === 2 ? `20${card.expYear}` : card.expYear,
        securityCode: card.cvv,
        identificationType: "CPF",
        identificationNumber: digits,
      });

      const res = await fetch("/api/onboarding/checkout/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "card",
          cardToken: tokenized.id,
          cpf: digits,
          installments:
            plan?.interval === "SEMESTER" ? installments : 1,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Pagamento recusado");
        return;
      }
      setPaymentId(data.paymentId || null);
      if (data.paid) {
        await goApp();
        return;
      }
      if (data.awaitingConfirm) {
        setAwaitingCard(true);
        return;
      }
      setError("Pagamento não aprovado. Tente outro cartão ou Pix.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no cartão");
    } finally {
      setPaying(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="onboard-shell flex items-center justify-center px-4">
        <p className="text-sm text-[var(--lp-steel)]">Preparando pagamento…</p>
      </div>
    );
  }

  const maxInstallments = plan?.interval === "SEMESTER" ? 6 : 1;

  return (
    <OnboardingShell step="pronto" sidebarTitle="Pronto!" showBack={false}>
      <div className="onboard-panel space-y-4">
        <div>
          <h1 className="onboard-title text-2xl sm:text-[1.85rem]">
            Pague e libere o acesso
          </h1>
          <p className="onboard-lead mt-2">
            Checkout transparente Mercado Pago — Pix ou cartão. Assim que
            confirmar, você entra no painel.
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        )}

        {plan && (
          <PaymentStep
            priceCents={plan.priceCents}
            productTitle={plan.name}
            paymentProviderLabel="Mercado Pago"
            demoPayments={false}
            payMethod={payMethod}
            onPayMethodChange={(m) => {
              setPayMethod(m);
              setError("");
              setAwaitingCard(false);
              if (m === "card") {
                setPixQr(null);
                setPixQrBase64(null);
              }
            }}
            pixLoading={pixLoading}
            pixQr={pixQr}
            pixQrBase64={pixQrBase64}
            copied={copied}
            onCopyPix={() => {
              if (!pixQr) return;
              void navigator.clipboard.writeText(pixQr);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            }}
            onDemoConfirm={() => undefined}
            onCheckPix={paymentId ? () => void checkPaid() : undefined}
            checkingPix={checking}
            paying={paying}
            card={card}
            onCardChange={setCard}
            onPayCard={(ev) => void onPayCard(ev)}
            formatCardNumber={formatCardNumber}
            showInstallments={maxInstallments > 1}
            cardMaxInstallments={maxInstallments}
            installments={installments}
            onInstallmentsChange={setInstallments}
            awaitingCardConfirm={awaitingCard}
            holdVariant="payment"
          />
        )}

        {payMethod === "card" && !awaitingCard && (
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">CPF do titular</span>
            <input
              className="input-field"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              required
            />
          </label>
        )}
      </div>
    </OnboardingShell>
  );
}
