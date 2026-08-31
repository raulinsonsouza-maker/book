"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatBRL, isValidCpf } from "@/lib/utils";
import { enabledProductFormFields } from "@/lib/product-form-config";
import type { ProductFormConfig } from "@/lib/product-form-config";
import type { FormFieldConfig } from "@/types/funnel-config";
import { FunnelFormFields } from "@/components/booking/FunnelFormFields";
import { PaymentStep } from "@/components/payment/PaymentStep";
import { SuccessStep } from "@/components/payment/SuccessStep";
import { encodeAsaasCardToken } from "@/lib/asaas/client";

function formatCardNumber(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 16);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function isFormReady(
  formFields: FormFieldConfig[],
  details: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerCpf: string;
  },
  answers: Record<string, string>,
) {
  for (const field of formFields) {
    if (!field.required) continue;

    if (field.preset === "customerName" && !details.customerName.trim()) return false;
    if (field.preset === "customerEmail") {
      const email = details.customerEmail.trim();
      if (!email || !email.includes("@")) return false;
    }
    if (field.preset === "customerPhone") {
      if (details.customerPhone.replace(/\D/g, "").length < 10) return false;
    }
    if (field.preset === "customerCpf") {
      if (!isValidCpf(details.customerCpf)) return false;
    }
    if (!field.preset && !answers[field.id]?.trim()) return false;
  }
  return true;
}

export function InstantCheckout({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [displayTitle, setDisplayTitle] = useState("");
  const [displayDescription, setDisplayDescription] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [displayLogoUrl, setDisplayLogoUrl] = useState<string | null>(null);
  const [accentColor, setAccentColor] = useState("#0a0a0a");
  const [productTitle, setProductTitle] = useState("");
  const [priceCents, setPriceCents] = useState(0);
  const [formConfig, setFormConfig] = useState<ProductFormConfig | null>(null);
  const [demoPayments, setDemoPayments] = useState(true);
  const [paymentProvider, setPaymentProvider] = useState<
    "CAKTO" | "MERCADO_PAGO" | "ASAAS" | "DEMO"
  >("DEMO");
  const [paymentProviderLabel, setPaymentProviderLabel] = useState("Demo");
  const [caktoSdkClientId, setCaktoSdkClientId] = useState<string | null>(null);
  const [mercadoPagoPublicKey, setMercadoPagoPublicKey] = useState<string | null>(null);

  const [paid, setPaid] = useState(false);
  const [details, setDetails] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerCpf: "",
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [orderId, setOrderId] = useState<string | null>(null);
  const [creatingOrder, setCreatingOrder] = useState(false);

  const [payMethod, setPayMethod] = useState<"pix" | "card">("pix");
  const [pixQr, setPixQr] = useState<string | null>(null);
  const [pixQrBase64, setPixQrBase64] = useState<string | null>(null);
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
  const [checkingPix, setCheckingPix] = useState(false);
  const [pixCheckHint, setPixCheckHint] = useState("");
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [holdCountdown, setHoldCountdown] = useState("");
  const [awaitingCardConfirm, setAwaitingCardConfirm] = useState(false);
  const [installments, setInstallments] = useState(1);
  const [cardMaxInstallments, setCardMaxInstallments] = useState(12);

  const formFields: FormFieldConfig[] = enabledProductFormFields(formConfig);
  const formReady = useMemo(
    () => isFormReady(formFields, details, answers),
    [formFields, details, answers],
  );

  const orderFingerprint = useMemo(
    () =>
      JSON.stringify({
        customerName: details.customerName.trim(),
        customerEmail: details.customerEmail.trim(),
        customerPhone: details.customerPhone.replace(/\D/g, ""),
        customerCpf: details.customerCpf.replace(/\D/g, ""),
        answers,
      }),
    [details, answers],
  );
  const lastOrderFingerprint = useRef<string | null>(null);
  const failedFingerprint = useRef<string | null>(null);

  useEffect(() => {
    fetch(`/api/public/checkout/${slug}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Link não encontrado");
        return r.json();
      })
      .then((data) => {
        setDisplayTitle(data.displayTitle);
        setDisplayDescription(data.displayDescription || null);
        setBusinessName(data.businessName || "");
        setDisplayLogoUrl(data.displayLogoUrl);
        setAccentColor(data.displayAccentColor || "#0a0a0a");
        setProductTitle(data.product.title);
        setPriceCents(data.product.priceCents);
        setFormConfig(data.formConfig);
        setDemoPayments(data.paymentProvider === "DEMO");
        setPaymentProvider(data.paymentProvider || "DEMO");
        setPaymentProviderLabel(data.paymentProviderLabel || "Demo");
        setCaktoSdkClientId(data.caktoSdkClientId);
        setMercadoPagoPublicKey(data.mercadoPagoPublicKey);
        setCardMaxInstallments(
          Math.min(12, Math.max(1, data.cardMaxInstallments || 12)),
        );
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [slug]);

  const createOrder = useCallback(async () => {
    if (creatingOrder || paid) return;

    setCreatingOrder(true);
    setError("");

    const customAnswers: Record<string, string> = {};
    for (const field of formFields) {
      if (!field.preset && answers[field.id]?.trim()) {
        customAnswers[field.id] = answers[field.id].trim();
      }
    }

    const payload: Record<string, unknown> = {
      customerName: details.customerName.trim(),
      customAnswers: Object.keys(customAnswers).length ? customAnswers : undefined,
    };
    for (const field of formFields) {
      if (field.preset === "customerEmail") payload.customerEmail = details.customerEmail.trim();
      if (field.preset === "customerPhone") {
        payload.customerPhone = details.customerPhone.replace(/\D/g, "");
      }
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
    setCreatingOrder(false);

    if (!res.ok) {
      setError(
        `${data.error || "Não foi possível liberar o pagamento"} Altere um campo e tente de novo.`,
      );
      setOrderId(null);
      setHoldExpiresAt(null);
      setPixQr(null);
      lastOrderFingerprint.current = null;
      failedFingerprint.current = orderFingerprint;
      return;
    }

    failedFingerprint.current = null;
    lastOrderFingerprint.current = orderFingerprint;
    setOrderId(data.orderId);
    setHoldExpiresAt(data.holdExpiresAt || null);
    setPixQr(null);
    setAwaitingCardConfirm(false);
  }, [
    answers,
    creatingOrder,
    details,
    formFields,
    orderFingerprint,
    paid,
    slug,
  ]);

  useEffect(() => {
    if (paid || !formReady || creatingOrder) return;
    if (orderId && lastOrderFingerprint.current === orderFingerprint) return;
    if (failedFingerprint.current === orderFingerprint) return;

    const timer = window.setTimeout(() => {
      void createOrder();
    }, 450);
    return () => window.clearTimeout(timer);
  }, [createOrder, creatingOrder, formReady, orderFingerprint, orderId, paid]);

  useEffect(() => {
    if (!formReady) {
      if (orderId) {
        void fetch(`/api/public/checkout/${slug}/pay?method=abandon`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        }).catch(() => undefined);
      }
      setOrderId(null);
      setHoldExpiresAt(null);
      setPixQr(null);
      setPixQrBase64(null);
      setAwaitingCardConfirm(false);
      lastOrderFingerprint.current = null;
      failedFingerprint.current = null;
    }
  }, [formReady, orderId, slug]);

  useEffect(() => {
    if (!holdExpiresAt || paid) {
      setHoldCountdown("");
      return;
    }
    const tick = () => {
      const ms = new Date(holdExpiresAt).getTime() - Date.now();
      if (ms <= 0) {
        setHoldCountdown("0:00");
        return;
      }
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setHoldCountdown(`${m}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [holdExpiresAt, paid]);

  useEffect(() => {
    if (holdCountdown !== "0:00" || !holdExpiresAt || paid) return;
    if (new Date(holdExpiresAt).getTime() > Date.now()) return;
    setError("O tempo para pagar acabou. Atualize a página ou altere seus dados para tentar de novo.");
    setOrderId(null);
    setHoldExpiresAt(null);
    setPixQr(null);
    setAwaitingCardConfirm(false);
    lastOrderFingerprint.current = null;
  }, [holdCountdown, holdExpiresAt, paid]);

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
      setPixQrBase64(data.qrCodeBase64 || null);
    },
    [slug],
  );

  useEffect(() => {
    if (!orderId || !formReady || paid) return;
    if (payMethod === "pix" && !pixQr && !pixLoading) {
      void startPix(orderId);
    }
  }, [formReady, orderId, paid, payMethod, pixQr, pixLoading, startPix]);

  useEffect(() => {
    if (!orderId || !formReady || paid) return;
    if (payMethod === "pix" && !pixQr) return;
    if (payMethod === "card" && !awaitingCardConfirm) return;
    const tick = async () => {
      try {
        const res = await fetch(
          `/api/public/checkout/${slug}/status?orderId=${orderId}`,
          { cache: "no-store" },
        );
        const data = await res.json();
        if (data.status === "PAID" || data.paymentStatus === "PAID") {
          setPaid(true);
          setAwaitingCardConfirm(false);
        }
        if (data.status === "EXPIRED") {
          setError("O tempo para pagar acabou. Altere um campo para tentar de novo.");
          setOrderId(null);
          setHoldExpiresAt(null);
          setPixQr(null);
          setAwaitingCardConfirm(false);
          lastOrderFingerprint.current = null;
        }
      } catch {
        /* keep polling */
      }
    };
    void tick();
    const id = setInterval(() => void tick(), 3000);
    return () => clearInterval(id);
  }, [formReady, payMethod, orderId, pixQr, awaitingCardConfirm, paid, slug]);

  async function checkPixNow() {
    if (!orderId || checkingPix) return;
    setCheckingPix(true);
    setPixCheckHint("Consultando pagamento…");
    try {
      const res = await fetch(
        `/api/public/checkout/${slug}/status?orderId=${orderId}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (data.status === "PAID" || data.paymentStatus === "PAID") {
        setPaid(true);
        setAwaitingCardConfirm(false);
        return;
      }
      if (data.status === "EXPIRED") {
        setError("O tempo para pagar acabou. Altere um campo para tentar de novo.");
        setOrderId(null);
        setHoldExpiresAt(null);
        setPixQr(null);
        setAwaitingCardConfirm(false);
        return;
      }
      setPixCheckHint(
        "Ainda não identificamos o pagamento. Se já pagou, aguarde alguns segundos e toque de novo.",
      );
    } catch {
      setPixCheckHint("Falha ao verificar. Tente novamente.");
    } finally {
      setCheckingPix(false);
    }
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
    if (res.ok) setPaid(true);
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
    if (paymentProvider === "ASAAS") {
      const cpf = details.customerCpf.replace(/\D/g, "");
      if (!isValidCpf(cpf)) {
        setPaying(false);
        setError("Informe um CPF válido para pagar com cartão");
        return;
      }
      cardToken = encodeAsaasCardToken({
        holderName: card.holderName,
        number: card.cardNumber,
        expiryMonth: card.expMonth,
        expiryYear: card.expYear,
        ccv: card.cvv,
      });
    } else if (paymentProvider === "MERCADO_PAGO" && mercadoPagoPublicKey && typeof window !== "undefined") {
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
        installments:
          paymentProvider === "MERCADO_PAGO" || paymentProvider === "ASAAS"
            ? Math.min(installments, cardMaxInstallments)
            : 1,
      }),
    });
    const data = await res.json();
    setPaying(false);
    if (!res.ok) {
      setError(data.error || "Pagamento recusado");
      return;
    }
    if (data.status === "PAID") setPaid(true);
    else {
      setAwaitingCardConfirm(true);
      setError("");
      setPixCheckHint(
        "Pagamento em análise. A tela atualiza sozinha — ou toque em verificar.",
      );
    }
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
          {displayLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayLogoUrl}
              alt=""
              className="mx-auto mb-4 h-14 max-w-[180px] object-contain"
            />
          ) : (
            <div
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{ background: accentColor }}
            >
              {(businessName || displayTitle || "BS").slice(0, 2).toUpperCase()}
            </div>
          )}
          {businessName && (
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
              {businessName}
            </p>
          )}
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{displayTitle}</h1>
          {displayDescription && (
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
              {displayDescription}
            </p>
          )}
          <p className="mt-4 text-3xl font-bold tracking-tight" style={{ color: accentColor }}>
            {formatBRL(priceCents)}
          </p>
        </header>

        <main className="flex-1 space-y-4">
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}

          {paid ? (
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <SuccessStep
                customerName={details.customerName}
                customerEmail={details.customerEmail}
                productTitle={productTitle}
                priceCents={priceCents}
              />
            </div>
          ) : (
            <>
              <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold">Seus dados</h2>
                <div className="mt-4 space-y-4">
                  <FunnelFormFields
                    fields={formFields}
                    details={details}
                    onDetailsChange={(patch) => setDetails({ ...details, ...patch })}
                    values={answers}
                    onChange={(id, value) => setAnswers({ ...answers, [id]: value })}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
                {!formReady ? (
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-muted">Pagamento</h2>
                    <p className="text-sm text-muted">
                      Preencha seus dados acima para liberar Pix ou cartão nesta mesma tela.
                    </p>
                    <div className="pointer-events-none select-none opacity-40">
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-border bg-muted-bg px-3 py-2.5 text-center text-sm font-semibold">
                          Pix
                        </div>
                        <div className="rounded-lg border border-border px-3 py-2.5 text-center text-sm font-semibold">
                          Cartão
                        </div>
                      </div>
                    </div>
                  </div>
                ) : creatingOrder && !orderId ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-foreground" />
                    Liberando pagamento…
                  </div>
                ) : orderId ? (
                  <PaymentStep
                    priceCents={priceCents}
                    productTitle={productTitle}
                    paymentProviderLabel={paymentProviderLabel}
                    demoPayments={demoPayments}
                    payMethod={payMethod}
                    onPayMethodChange={(m) => {
                      setPayMethod(m);
                      setError("");
                      if (m === "card") {
                        setPixQr(null);
                        setPixQrBase64(null);
                      }
                    }}
                    pixLoading={pixLoading}
                    pixQr={pixQr}
                    pixQrBase64={pixQrBase64}
                    copied={copied}
                    onCopyPix={async () => {
                      if (pixQr) {
                        await navigator.clipboard.writeText(pixQr);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }
                    }}
                    onDemoConfirm={confirmDemoPix}
                    onCheckPix={() => void checkPixNow()}
                    checkingPix={checkingPix}
                    pixCheckHint={pixCheckHint}
                    paying={paying}
                    card={card}
                    onCardChange={setCard}
                    onPayCard={payCard}
                    formatCardNumber={formatCardNumber}
                    holdExpiresAt={holdExpiresAt}
                    holdCountdown={holdCountdown}
                    holdVariant="payment"
                    installments={installments}
                    onInstallmentsChange={setInstallments}
                    cardMaxInstallments={cardMaxInstallments}
                    showInstallments={
                      paymentProvider === "MERCADO_PAGO" ||
                      paymentProvider === "ASAAS"
                    }
                    awaitingCardConfirm={awaitingCardConfirm}
                  />
                ) : (
                  <p className="text-sm text-muted">Aguardando liberação do pagamento…</p>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
