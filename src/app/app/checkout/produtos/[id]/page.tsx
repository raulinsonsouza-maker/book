"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FIELD_PRESETS } from "@/types/funnel-config";
import type { FormFieldConfig } from "@/types/funnel-config";
import {
  defaultProductFormConfig,
  isCheckoutLockedPreset,
  normalizePayMethods,
  parseProductFormConfig,
  type PayMethod,
} from "@/lib/product-form-config";
import { CAKTO_ENABLED } from "@/lib/feature-flags";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { CheckoutSubnav } from "@/components/admin/CheckoutSubnav";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Product = {
  id: string;
  title: string;
  description: string | null;
  priceCents: number;
  caktoOfferId: string | null;
  formConfig: string | null;
  isActive: boolean;
  cardMaxInstallments: number | null;
  orgCardMaxInstallments?: number;
  checkoutLinks: { slug: string }[];
};

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function inputToCents(value: string) {
  return Math.round(parseFloat(value.replace(",", ".")) * 100);
}

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { confirm } = useConfirm();
  const [product, setProduct] = useState<Product | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [caktoOfferId, setCaktoOfferId] = useState("");
  const [formFields, setFormFields] = useState<FormFieldConfig[]>(
    defaultProductFormConfig().formFields,
  );
  const [payMethods, setPayMethods] = useState<PayMethod[]>(
    normalizePayMethods(defaultProductFormConfig().payMethods),
  );
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkSlug, setLinkSlug] = useState<string | null>(null);
  /** null = padrão do site */
  const [cardMaxInstallments, setCardMaxInstallments] = useState<number | null>(
    null,
  );
  const [orgCardMaxInstallments, setOrgCardMaxInstallments] = useState(12);
  const [paymentProvider, setPaymentProvider] = useState<
    "CAKTO" | "MERCADO_PAGO" | "ASAAS"
  >("CAKTO");
  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "";

  useEffect(() => {
    fetch("/api/organization")
      .then((r) => r.json())
      .then((data) => setPaymentProvider(data.paymentProvider || "CAKTO"));

    fetch(`/api/checkout/products/${id}`)
      .then((r) => r.json())
      .then((data: Product) => {
        setProduct(data);
        setTitle(data.title);
        setDescription(data.description || "");
        setPrice(centsToInput(data.priceCents));
        setCaktoOfferId(data.caktoOfferId || "");
        const parsed = parseProductFormConfig(data.formConfig);
        setFormFields(parsed.formFields);
        setPayMethods(normalizePayMethods(parsed.payMethods));
        setLinkSlug(data.checkoutLinks?.[0]?.slug ?? null);
        setCardMaxInstallments(
          data.cardMaxInstallments == null ? null : data.cardMaxInstallments,
        );
        setOrgCardMaxInstallments(data.orgCardMaxInstallments || 12);
      })
      .finally(() => setLoading(false));
  }, [id]);

  function toggleField(preset: string, enabled: boolean) {
    if (isCheckoutLockedPreset(preset)) return;
    setFormFields((prev) =>
      prev.map((f) => (f.preset === preset ? { ...f, enabled } : f)),
    );
  }

  function togglePayMethod(method: PayMethod, enabled: boolean) {
    setPayMethods((prev) => {
      const next = new Set(prev);
      if (enabled) next.add(method);
      else next.delete(method);
      if (next.size === 0) return prev;
      return normalizePayMethods([...next]);
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (payMethods.length === 0) {
      setSaveMsg({
        tone: "err",
        text: "Escolha ao menos uma forma de pagamento.",
      });
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    const res = await fetch(`/api/checkout/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || null,
        priceCents: inputToCents(price),
        ...(paymentProvider === "CAKTO" ? { caktoOfferId: caktoOfferId || null } : {}),
        isActive: true,
        productKind: "SIMPLE",
        intakeTemplateKey: null,
        cardMaxInstallments: payMethods.includes("card")
          ? cardMaxInstallments
          : null,
        formConfig: { formFields, payMethods },
      }),
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      setSaveMsg({ tone: "err", text: "Não foi possível salvar. Tente de novo." });
      return;
    }
    setSaveMsg({
      tone: "ok",
      text: "Salvo. O link de pagamento está no ar.",
    });
  }

  async function remove() {
    const ok = await confirm({
      title: "Excluir este produto?",
      description: "Links de pagamento vinculados também serão removidos. Não dá para desfazer.",
      confirmLabel: "Excluir produto",
      cancelLabel: "Manter",
      tone: "danger",
    });
    if (!ok) return;
    await fetch(`/api/checkout/products/${id}`, { method: "DELETE" });
    router.push("/app/checkout/produtos");
  }

  if (loading) return <p className="text-sm text-muted">Carregando…</p>;
  if (!product) return <p className="text-sm text-danger">Produto não encontrado.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/app/checkout/produtos" className="text-sm text-muted hover:text-foreground">
          ← Produtos
        </Link>
        {linkSlug && <CopyLinkButton url={`${appUrl}/pay/${linkSlug}`} />}
      </div>

      <CheckoutSubnav />

      <form onSubmit={save} className="surface max-w-2xl space-y-4 p-6">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Título</span>
          <input required className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Descrição</span>
          <textarea className="input-field min-h-24" value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Preço (R$)</span>
          <input required className="input-field max-w-xs" value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <div>
          <p className="mb-1.5 text-sm font-medium">Formas de pagamento</p>
          <ul className="space-y-2">
            {(
              [
                { id: "pix" as const, label: "Pix" },
                { id: "card" as const, label: "Cartão de crédito" },
              ] as const
            ).map((m) => (
              <li key={m.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={payMethods.includes(m.id)}
                  onChange={(e) => togglePayMethod(m.id, e.target.checked)}
                />
                {m.label}
              </li>
            ))}
          </ul>
        </div>

        {CAKTO_ENABLED && paymentProvider === "CAKTO" && (
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Cakto Offer ID (opcional)</span>
            <p className="mb-1.5 text-xs text-muted">
              Sobrescreve a oferta padrão da integração Cakto para este produto.
            </p>
            <input className="input-field" value={caktoOfferId} onChange={(e) => setCaktoOfferId(e.target.value)} />
          </label>
        )}
        {payMethods.includes("card") && (
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Parcelas no cartão</span>
            <p className="mb-1.5 text-xs text-muted">
              Quantas parcelas o cliente pode escolher nesta cobrança. Padrão do
              site:{" "}
              {orgCardMaxInstallments === 1
                ? "só à vista"
                : `até ${orgCardMaxInstallments}x`}
              .
            </p>
            <select
              className="input-field max-w-xs"
              value={cardMaxInstallments == null ? "" : String(cardMaxInstallments)}
              onChange={(e) => {
                const v = e.target.value;
                setCardMaxInstallments(v === "" ? null : Number(v) || 1);
              }}
            >
              <option value="">
                Usar padrão do site (
                {orgCardMaxInstallments === 1
                  ? "só à vista"
                  : `até ${orgCardMaxInstallments}x`}
                )
              </option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? "1x — só à vista" : `Até ${n}x`}
                </option>
              ))}
            </select>
          </label>
        )}

        <div>
          <p className="mb-2 text-sm font-medium">Campos do formulário</p>
          <ul className="space-y-2">
            {FIELD_PRESETS.filter((p) => p.preset).map((preset) => {
              const field = formFields.find((f) => f.preset === preset.preset);
              const locked = isCheckoutLockedPreset(preset.preset);
              const enabled = locked || (field?.enabled ?? false);
              return (
                <li key={preset.preset} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={enabled}
                    disabled={locked}
                    onChange={(e) => toggleField(preset.preset!, e.target.checked)}
                  />
                  {preset.label}
                </li>
              );
            })}
          </ul>
        </div>

        {saveMsg && (
          <p
            className={`rounded-lg border px-3 py-2 text-sm ${
              saveMsg.tone === "err"
                ? "border-red-200 bg-red-50 text-danger"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {saveMsg.text}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Salvando…" : "Salvar"}
          </button>
          <button type="button" onClick={remove} className="btn-secondary text-danger">
            Excluir
          </button>
        </div>
      </form>
    </div>
  );
}
