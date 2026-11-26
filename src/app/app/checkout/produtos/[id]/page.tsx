"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
import {
  parseBusinessProfile,
  productFormPlaceholders,
  type BusinessProfileId,
} from "@/lib/business-profile";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { CheckoutSubnav } from "@/components/admin/CheckoutSubnav";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import {
  MAX_PRODUCT_IMAGES,
  normalizeBackgroundColor,
  parseVideoUrl,
} from "@/lib/product-media";

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
  backgroundColor?: string | null;
  imageUrls?: string[] | string | null;
  videoUrl?: string | null;
};

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function inputToCents(value: string) {
  return Math.round(parseFloat(value.replace(",", ".")) * 100);
}

function asImageList(value: Product["imageUrls"]): string[] {
  if (Array.isArray(value)) return value.filter(Boolean);
  return [];
}

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { confirm } = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
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
  const [businessProfile, setBusinessProfile] =
    useState<BusinessProfileId | null>(null);
  const [backgroundColor, setBackgroundColor] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaMsg, setMediaMsg] = useState<string | null>(null);
  const placeholders = productFormPlaceholders(businessProfile);
  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "";

  useEffect(() => {
    fetch("/api/organization")
      .then((r) => r.json())
      .then((data) => {
        setPaymentProvider(data.paymentProvider || "CAKTO");
        setBusinessProfile(parseBusinessProfile(data.businessProfile));
      });

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
        setBackgroundColor(normalizeBackgroundColor(data.backgroundColor));
        setImageUrls(asImageList(data.imageUrls));
        setVideoUrl(data.videoUrl || "");
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

  async function uploadImage(file: File | null) {
    if (!file) return;
    setMediaBusy(true);
    setMediaMsg(null);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch(`/api/checkout/products/${id}/images`, {
      method: "POST",
      body,
    }).catch(() => null);
    setMediaBusy(false);
    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      setMediaMsg(data?.error || "Não foi possível enviar a foto.");
      return;
    }
    const data = await res.json();
    setImageUrls(Array.isArray(data.imageUrls) ? data.imageUrls : []);
  }

  async function removeImage(url: string) {
    setMediaBusy(true);
    setMediaMsg(null);
    const res = await fetch(
      `/api/checkout/products/${id}/images?url=${encodeURIComponent(url)}`,
      { method: "DELETE" },
    ).catch(() => null);
    setMediaBusy(false);
    if (!res?.ok) {
      setMediaMsg("Não foi possível remover a foto.");
      return;
    }
    const data = await res.json();
    setImageUrls(Array.isArray(data.imageUrls) ? data.imageUrls : []);
  }

  async function moveImage(index: number, dir: -1 | 1) {
    const nextIndex = index + dir;
    if (nextIndex < 0 || nextIndex >= imageUrls.length) return;
    const next = [...imageUrls];
    const tmp = next[index]!;
    next[index] = next[nextIndex]!;
    next[nextIndex] = tmp;
    setImageUrls(next);
    setMediaBusy(true);
    const res = await fetch(`/api/checkout/products/${id}/images`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrls: next }),
    }).catch(() => null);
    setMediaBusy(false);
    if (!res?.ok) {
      setMediaMsg("Não foi possível reordenar.");
      return;
    }
    const data = await res.json();
    setImageUrls(Array.isArray(data.imageUrls) ? data.imageUrls : next);
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
    if (videoUrl.trim() && !parseVideoUrl(videoUrl)) {
      setSaveMsg({
        tone: "err",
        text: "URL de vídeo inválida — use YouTube, Vimeo ou link https .mp4.",
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
        backgroundColor,
        videoUrl: videoUrl.trim() || null,
      }),
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      setSaveMsg({
        tone: "err",
        text: data?.error || "Não foi possível salvar. Tente de novo.",
      });
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
          <input
            required
            className="input-field"
            placeholder={placeholders.title}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Descrição</span>
          <textarea
            className="input-field min-h-24"
            placeholder={placeholders.description}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Preço (R$)</span>
          <input required className="input-field max-w-xs" value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>

        <div className="space-y-3 rounded-xl border border-border bg-muted-bg/40 p-4">
          <div>
            <p className="text-sm font-medium">Aparência do checkout</p>
            <p className="mt-0.5 text-xs text-muted">
              Cor de fundo, fotos do produto e um vídeo opcional.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Cor de fundo</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="h-10 w-12 cursor-pointer rounded border border-border bg-white p-1"
                  value={backgroundColor || "#ffffff"}
                  onChange={(e) =>
                    setBackgroundColor(normalizeBackgroundColor(e.target.value))
                  }
                />
                <input
                  className="input-field w-28 font-mono text-xs"
                  value={backgroundColor || ""}
                  placeholder="#ffffff"
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    if (!v) {
                      setBackgroundColor(null);
                      return;
                    }
                    setBackgroundColor(normalizeBackgroundColor(v) || v);
                  }}
                />
              </div>
            </label>
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={() => setBackgroundColor(null)}
            >
              Padrão do tema
            </button>
          </div>

          <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">
                Fotos do produto ({imageUrls.length}/{MAX_PRODUCT_IMAGES})
              </p>
              <button
                type="button"
                className="btn-secondary text-sm"
                disabled={mediaBusy || imageUrls.length >= MAX_PRODUCT_IMAGES}
                onClick={() => fileRef.current?.click()}
              >
                {mediaBusy ? "Enviando…" : "Adicionar foto"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  void uploadImage(e.target.files?.[0] || null);
                  e.target.value = "";
                }}
              />
            </div>
            <p className="mb-2 text-xs text-muted">
              Até 5 imagens (PNG, JPG ou WebP, máx. 2 MB). Com mais de um item
              (fotos + vídeo), o checkout mostra uma galeria.
            </p>
            {imageUrls.length > 0 ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {imageUrls.map((url, index) => (
                  <li
                    key={url}
                    className="overflow-hidden rounded-lg border border-border bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <div className="flex items-center justify-between gap-1 border-t border-border px-2 py-1.5">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="text-xs text-muted hover:text-foreground disabled:opacity-40"
                          disabled={mediaBusy || index === 0}
                          onClick={() => void moveImage(index, -1)}
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          className="text-xs text-muted hover:text-foreground disabled:opacity-40"
                          disabled={mediaBusy || index === imageUrls.length - 1}
                          onClick={() => void moveImage(index, 1)}
                        >
                          →
                        </button>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-danger"
                        disabled={mediaBusy}
                        onClick={() => void removeImage(url)}
                      >
                        Remover
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
            {mediaMsg ? (
              <p className="mt-2 text-xs text-danger">{mediaMsg}</p>
            ) : null}
          </div>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Vídeo (URL)</span>
            <p className="mb-1.5 text-xs text-muted">
              YouTube, Vimeo ou link https de arquivo .mp4 — opcional.
            </p>
            <input
              className="input-field"
              placeholder="https://www.youtube.com/watch?v=..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
            {videoUrl.trim() && parseVideoUrl(videoUrl) ? (
              <p className="mt-1.5 text-xs text-emerald-700">URL válida</p>
            ) : null}
          </label>
        </div>

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
