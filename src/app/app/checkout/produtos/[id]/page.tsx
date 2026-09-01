"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FIELD_PRESETS } from "@/types/funnel-config";
import type { FormFieldConfig } from "@/types/funnel-config";
import { defaultProductFormConfig, parseProductFormConfig } from "@/lib/product-form-config";
import { parseNotifyEmails } from "@/lib/intake/notify-emails";
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
  productKind: "SIMPLE" | "INTAKE";
  intakeTemplateKey: string | null;
  notifyEmails: string | null;
  intakeEmailAlerts: boolean;
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
  const [isActive, setIsActive] = useState(true);
  const [formFields, setFormFields] = useState<FormFieldConfig[]>(
    defaultProductFormConfig().formFields,
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [linkSlug, setLinkSlug] = useState<string | null>(null);
  const [productKind, setProductKind] = useState<"SIMPLE" | "INTAKE">("SIMPLE");
  const [notifyEmailsText, setNotifyEmailsText] = useState("");
  const [intakeEmailAlerts, setIntakeEmailAlerts] = useState(true);
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
        setIsActive(data.isActive);
        setProductKind(data.productKind === "INTAKE" ? "INTAKE" : "SIMPLE");
        setNotifyEmailsText(parseNotifyEmails(data.notifyEmails).join(", "));
        setIntakeEmailAlerts(data.intakeEmailAlerts ?? true);
        setFormFields(parseProductFormConfig(data.formConfig).formFields);
        setLinkSlug(data.checkoutLinks?.[0]?.slug ?? null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  function toggleField(preset: string, enabled: boolean) {
    setFormFields((prev) =>
      prev.map((f) => (f.preset === preset ? { ...f, enabled } : f)),
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/checkout/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || null,
        priceCents: inputToCents(price),
        ...(paymentProvider === "CAKTO" ? { caktoOfferId: caktoOfferId || null } : {}),
        isActive,
        productKind,
        intakeTemplateKey: productKind === "INTAKE" ? "company_opening_br" : null,
        notifyEmails: notifyEmailsText
          .split(/[,;]/)
          .map((e) => e.trim())
          .filter(Boolean),
        intakeEmailAlerts,
        formConfig: productKind === "SIMPLE" ? { formFields } : undefined,
      }),
    });
    setSaving(false);
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
        {CAKTO_ENABLED && paymentProvider === "CAKTO" ? (
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Cakto Offer ID (opcional)</span>
            <p className="mb-1.5 text-xs text-muted">
              Sobrescreve a oferta padrão da integração Cakto para este produto.
            </p>
            <input className="input-field" value={caktoOfferId} onChange={(e) => setCaktoOfferId(e.target.value)} />
          </label>
        ) : (
          <p className="text-sm text-muted">
            Pagamentos deste produto usam o{" "}
            <strong className="text-foreground">Mercado Pago</strong> definido em Integrações.
          </p>
        )}
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Tipo de produto</span>
          <select
            className="input-field max-w-xs"
            value={productKind}
            onChange={(e) => setProductKind(e.target.value as "SIMPLE" | "INTAKE")}
          >
            <option value="SIMPLE">Checkout simples</option>
            <option value="INTAKE">Intake (formulário + documentos)</option>
          </select>
        </label>
        {productKind === "INTAKE" && (
          <>
            <p className="text-sm text-muted">
              Template: Abertura de Empresa (Brasil) — wizard com sócios, dados da empresa e upload de documentos.
            </p>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">E-mails da equipe (avisos)</span>
              <input
                className="input-field"
                placeholder="legalizacaovenx@gmail.com"
                value={notifyEmailsText}
                onChange={(e) => setNotifyEmailsText(e.target.value)}
              />
              <span className="mt-1 block text-xs text-muted">
                Separados por vírgula. Recebem aviso com link ao painel — sem anexos.
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={intakeEmailAlerts}
                onChange={(e) => setIntakeEmailAlerts(e.target.checked)}
              />
              Enviar e-mail de aviso à equipe após pagamento
            </label>
          </>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Produto ativo
        </label>

        {productKind === "SIMPLE" && (
          <div>
            <p className="mb-2 text-sm font-medium">Campos do formulário</p>
            <ul className="space-y-2">
              {FIELD_PRESETS.filter((p) => p.preset).map((preset) => {
                const field = formFields.find((f) => f.preset === preset.preset);
                const enabled = field?.enabled ?? false;
                return (
                  <li key={preset.preset} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => toggleField(preset.preset!, e.target.checked)}
                    />
                    {preset.label}
                  </li>
                );
              })}
            </ul>
          </div>
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
