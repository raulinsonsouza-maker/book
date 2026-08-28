"use client";

import { useCallback, useEffect, useState } from "react";
import { formatBRL, isValidCpf } from "@/lib/utils";
import { enabledProductFormFields } from "@/lib/product-form-config";
import type { ProductFormConfig } from "@/lib/product-form-config";
import type { FormFieldConfig } from "@/types/funnel-config";
import { FunnelFormFields } from "@/components/booking/FunnelFormFields";
import { PaymentStep } from "@/components/payment/PaymentStep";
import { SuccessStep } from "@/components/payment/SuccessStep";

type Step = "details" | "payment" | "done";

function formatCardNumber(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 16);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function InstantCheckout({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [displayTitle, setDisplayTitle] = useState("");
  const [displayLogoUrl, setDisplayLogoUrl] = useState<string | null>(null);
  const [accentColor, setAccentColor] = useState("#0a0a0a");
  const [productTitle, setProductTitle] = useState("");
  const [productDescription, setProductDescription] = useState<string | null>(null);
  const [priceCents, setPriceCents] = useState(0);
  const [formConfig, setFormConfig] = useState<ProductFormConfig | null>(null);
  const [demoPayments, setDemoPayments] = useState(true);
  const [paymentProvider, setPaymentProvider] = useState<"CAKTO" | "MERCADO_PAGO" | "DEMO">("DEMO");
  const [paymentProviderLabel, setPaymentProviderLabel] = useState("Demo");
  const [caktoSdkClientId, setCaktoSdkClientId] = useState<string | null>(null);
  const [mercadoPagoPublicKey, setMercadoPagoPublicKey] = useState<string | null>(null);

  const [step, setStep] = useState<Step>("details");
  const [details, setDetails] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerCpf: "",
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [orderId, setOrderId] = useState<string | null>(null);

  const [payMethod, setPayMethod] = useState<"pix" | "card">("pix");
  const [pixQr, setPixQr] = useState<string | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [card, setCard] = useState({
    holderName: "",
    cardNumber: "",
    cvv: "",
    expMonth: "",
    expYear: "",
  });
  const [paying, setPaying] = useState(false);

  const formFields: FormFieldConfig[] = enabledProductFormFields(formConfig);

  useEffect(() => {
    fetch(`/api/public/checkout/${slug}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Link não encontrado");
        return r.json();
      })
      .then((data) => {
        setDisplayTitle(data.displayTitle);
        setDisplayLogoUrl(data.displayLogoUrl);
        setAccentColor(data.displayAccentColor || "#0a0a0a");
        setProductTitle(data.product.title);
        setProductDescription(data.product.description);
        setPriceCents(data.product.priceCents);
        setFormConfig(data.formConfig);
        setDemoPayments(data.paymentProvider === "DEMO");
        setPaymentProvider(data.paymentProvider || "DEMO");
        setPaymentProviderLabel(
          data.paymentProvider === "MERCADO_PAGO"
            ? "Mercado Pago"
            : data.paymentProvider === "CAKTO"
              ? "Cakto"
              : "Demo",
        );
        setCaktoSdkClientId(data.caktoSdkClientId);
        setMercadoPagoPublicKey(data.mercadoPagoPublicKey);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [slug]);

  const startPix = useCallback(
    async (id: string) => {
      setPixLoading(true);
      setError("");
      const res = await fetch(`/api/public/checkout/${slug}/pay?method=pix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id, fingerprint: `fp_${id}` }),
      });
      const data = await res.json();
      setPixLoading(false);
      if (!res.ok) {
        setError(data.error || "Erro ao gerar Pix");
        return;
      }
      setPixQr(data.qrCode);
    },
    [slug],
  );

  useEffect(() => {
    if (step !== "payment" || !orderId) return;
    if (payMethod === "pix" && !pixQr && !pixLoading) {
      startPix(orderId);
    }
  }, [step, orderId, payMethod, pixQr, pixLoading, startPix]);

  useEffect(() => {
    if (step !== "payment" || payMethod !== "pix" || !orderId || !pixQr) return;
    const id = setInterval(async () => {
      const res = await fetch(`/api/public/checkout/${slug}/status?orderId=${orderId}`);
      const data = await res.json();
      if (data.status === "PAID") setStep("done");
    }, 2500);
    return () => clearInterval(id);
  }, [step, payMethod, orderId, pixQr, slug]);

  async function submitDetails(e: React.FormEvent) {
    e.preventDefault();
    const cpfField = formFields.find((f) => f.preset === "customerCpf" && f.enabled);
    if (cpfField?.required && !isValidCpf(details.customerCpf)) {
      setError("Informe um CPF válido");
      return;
    }
    for (const field of formFields) {
      if (!field.preset && field.required && !answers[field.id]?.trim()) {
        setError(`Preencha: ${field.label}`);
        return;
      }
    }

    setError("");
    setPaying(true);
    const customAnswers: Record<string, string> = {};
    for (const field of formFields) {
      if (!field.preset && answers[field.id]?.trim()) {
        customAnswers[field.id] = answers[field.id].trim();
      }
    }

    const payload: Record<string, unknown> = {
      customerName: details.customerName,
      customAnswers: Object.keys(customAnswers).length ? customAnswers : undefined,
    };
    for (const field of formFields) {
      if (field.preset === "customerEmail") payload.customerEmail = details.customerEmail;
      if (field.preset === "customerPhone") payload.customerPhone = details.customerPhone.replace(/\D/g, "");
      if (field.preset === "customerCpf" && details.customerCpf) {
        payload.customerCpf = details.customerCpf.replace(/\D/g, "");
      }
    }

    const res = await fetch(`/api/public/checkout/${slug}/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setPaying(false);
    if (!res.ok) {
      setError(data.error || "Não foi possível continuar");
      return;
    }
    setOrderId(data.orderId);
    setPixQr(null);
    setStep("payment");
  }

  async function confirmDemoPix() {
    if (!orderId) return;
    setPaying(true);
    const res = await fetch(`/api/public/checkout/${slug}/pay?method=demo-confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    setPaying(false);
    if (res.ok) setStep("done");
    else {
      const data = await res.json();
      setError(data.error || "Erro");
    }
  }

  async function payCard(e: React.FormEvent) {
    e.preventDefault();
    if (!orderId) return;
    setPaying(true);
    setError("");

    let cardToken = `demo_${Date.now()}`;
    if (paymentProvider === "MERCADO_PAGO" && mercadoPagoPublicKey && typeof window !== "undefined") {
      try {
        // @ts-expect-error MercadoPago global
        if (!window.MercadoPago) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "https://sdk.mercadopago.com/js/v2";
            s.onload = () => resolve();
            s.onerror = () => reject(new Error("SDK Mercado Pago falhou"));
            document.body.appendChild(s);
          });
        }
        const cpf = details.customerCpf.replace(/\D/g, "");
        if (!isValidCpf(cpf)) {
          setPaying(false);
          setError("Informe um CPF válido para pagar com cartão");
          return;
        }
        // @ts-expect-error MercadoPago global
        const mp = new window.MercadoPago(mercadoPagoPublicKey);
        const tokenized = await mp.createCardToken({
          cardNumber: card.cardNumber.replace(/\D/g, ""),
          cardholderName: card.holderName,
          cardExpirationMonth: card.expMonth.padStart(2, "0"),
          cardExpirationYear: card.expYear.length === 2 ? `20${card.expYear}` : card.expYear,
          securityCode: card.cvv,
          identificationType: "CPF",
          identificationNumber: cpf,
        });
        cardToken = tokenized.id;
      } catch (err) {
        setPaying(false);
        setError(err instanceof Error ? err.message : "Erro ao tokenizar cartão");
        return;
      }
    } else if (caktoSdkClientId && typeof window !== "undefined") {
      try {
        // @ts-expect-error Cakto global
        if (!window.Cakto) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "https://cakto-sdk.pages.dev/cakto-sdk.min.js";
            s.onload = () => resolve();
            s.onerror = () => reject(new Error("SDK falhou"));
            document.body.appendChild(s);
          });
        }
        // @ts-expect-error Cakto global
        const sdk = new window.Cakto.CaktoSDK({ client_id: caktoSdkClientId });
        const tokenized = await sdk.createToken({
          holderName: card.holderName,
          cardNumber: card.cardNumber.replace(/\D/g, ""),
          cvv: card.cvv,
          expMonth: card.expMonth.padStart(2, "0"),
          expYear: card.expYear.length === 2 ? card.expYear : card.expYear.slice(-2),
        });
        cardToken = tokenized.cardToken;
      } catch (err) {
        console.warn("Cakto SDK fallback", err);
      }
    }

    const res = await fetch(`/api/public/checkout/${slug}/pay?method=card`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        fingerprint: `fp_${orderId}`,
        cardToken,
      }),
    });
    const data = await res.json();
    setPaying(false);
    if (!res.ok) {
      setError(data.error || "Pagamento recusado");
      return;
    }
    if (data.status === "PAID") setStep("done");
    else setError(data.message || "Aguardando confirmação");
  }

  if (loading) {
    return (
      <div className="dot-grid flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  if (error && !displayTitle) {
    return (
      <div className="dot-grid flex min-h-screen items-center justify-center text-sm text-danger">
        {error}
      </div>
    );
  }

  return (
    <div className="dot-grid min-h-screen" style={{ "--accent": accentColor } as React.CSSProperties}>
      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-8">
        <header className="mb-8 text-center">
          {displayLogoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayLogoUrl} alt="" className="mx-auto mb-4 h-12 object-contain" />
          )}
          <h1 className="text-2xl font-bold tracking-tight">{displayTitle}</h1>
          {productDescription && (
            <p className="mt-2 text-sm text-muted">{productDescription}</p>
          )}
          <p className="mt-3 text-3xl font-bold">{formatBRL(priceCents)}</p>
        </header>

        <main className="flex-1 rounded-2xl border border-border bg-white p-6 shadow-sm">
          {error && (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}

          {step === "details" && (
            <form onSubmit={submitDetails} className="space-y-4">
              <h2 className="text-lg font-semibold">Seus dados</h2>
              <FunnelFormFields
                fields={formFields}
                details={details}
                onDetailsChange={(patch) => setDetails({ ...details, ...patch })}
                values={answers}
                onChange={(id, value) => setAnswers({ ...answers, [id]: value })}
              />
              <button type="submit" disabled={paying} className="btn-primary w-full py-3">
                {paying ? "Continuando…" : "Ir para pagamento"}
              </button>
            </form>
          )}

          {step === "payment" && (
            <PaymentStep
              priceCents={priceCents}
              productTitle={productTitle}
              paymentProviderLabel={paymentProviderLabel}
              demoPayments={demoPayments}
              payMethod={payMethod}
              onPayMethodChange={(m) => {
                setPayMethod(m);
                setError("");
              }}
              pixLoading={pixLoading}
              pixQr={pixQr}
              copied={copied}
              onCopyPix={async () => {
                if (pixQr) {
                  await navigator.clipboard.writeText(pixQr);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }
              }}
              onDemoConfirm={confirmDemoPix}
              paying={paying}
              card={card}
              onCardChange={setCard}
              onPayCard={payCard}
              formatCardNumber={formatCardNumber}
            />
          )}

          {step === "done" && (
            <SuccessStep
              customerName={details.customerName}
              customerEmail={details.customerEmail}
              productTitle={productTitle}
              priceCents={priceCents}
            />
          )}
        </main>
      </div>
    </div>
  );
}
