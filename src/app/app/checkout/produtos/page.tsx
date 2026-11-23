"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatBRL,
  maskBRLFromDigits,
  parseBRLMaskToCents,
} from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { CheckoutSubnav } from "@/components/admin/CheckoutSubnav";
import { FIELD_PRESETS } from "@/types/funnel-config";
import type { FormFieldConfig } from "@/types/funnel-config";
import {
  defaultProductFormConfig,
  isCheckoutLockedPreset,
  normalizePayMethods,
  type PayMethod,
} from "@/lib/product-form-config";
import { CAKTO_ENABLED } from "@/lib/feature-flags";

type Product = {
  id: string;
  title: string;
  description: string | null;
  priceCents: number;
  isActive: boolean;
  checkoutLinks: { slug: string }[];
  _count: { orders: number };
};

function emptyCreateForm() {
  const defaults = defaultProductFormConfig();
  return {
    title: "",
    description: "",
    price: "",
    caktoOfferId: "",
    cardMaxInstallments: null as number | null,
    payMethods: normalizePayMethods(defaults.payMethods) as PayMethod[],
    formFields: defaults.formFields as FormFieldConfig[],
  };
}

export default function CheckoutProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [paymentProvider, setPaymentProvider] = useState<
    "CAKTO" | "MERCADO_PAGO" | "ASAAS" | "DEMO"
  >("DEMO");
  const [orgCardMaxInstallments, setOrgCardMaxInstallments] = useState(12);
  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "";

  async function load() {
    const res = await fetch("/api/checkout/products");
    const data = await res.json();
    setProducts(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    fetch("/api/organization")
      .then((r) => r.json())
      .then((data) => {
        setPaymentProvider(data.paymentProvider || "DEMO");
        setOrgCardMaxInstallments(
          Math.min(12, Math.max(1, data.cardMaxInstallments || 12)),
        );
      })
      .catch(() => undefined);
  }, []);

  function openCreate() {
    setForm(emptyCreateForm());
    setCreateError("");
    setShowCreate(true);
  }

  function closeCreate() {
    if (creating) return;
    setShowCreate(false);
    setCreateError("");
  }

  function toggleField(preset: string, enabled: boolean) {
    if (isCheckoutLockedPreset(preset)) return;
    setForm((prev) => ({
      ...prev,
      formFields: prev.formFields.map((f) =>
        f.preset === preset ? { ...f, enabled } : f,
      ),
    }));
  }

  function togglePayMethod(method: PayMethod, enabled: boolean) {
    setForm((prev) => {
      const next = new Set(prev.payMethods);
      if (enabled) next.add(method);
      else next.delete(method);
      if (next.size === 0) return prev;
      return {
        ...prev,
        payMethods: normalizePayMethods([...next]),
      };
    });
  }

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    const priceCents = parseBRLMaskToCents(form.price);
    if (!form.title.trim()) {
      setCreateError("Informe o título do produto");
      return;
    }
    if (!form.price.trim() || priceCents < 0) {
      setCreateError("Informe um preço válido");
      return;
    }
    if (form.payMethods.length === 0) {
      setCreateError("Escolha ao menos uma forma de pagamento");
      return;
    }
    setCreating(true);
    setCreateError("");
    const res = await fetch("/api/checkout/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title.trim(),
        description: form.description.trim() || null,
        priceCents,
        ...(CAKTO_ENABLED && paymentProvider === "CAKTO" && form.caktoOfferId
          ? { caktoOfferId: form.caktoOfferId }
          : {}),
        cardMaxInstallments: form.payMethods.includes("card")
          ? form.cardMaxInstallments
          : null,
        formConfig: {
          formFields: form.formFields,
          payMethods: form.payMethods,
        },
      }),
    });
    const data = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) {
      setCreateError(data.error || "Não foi possível criar o produto");
      return;
    }
    setShowCreate(false);
    setForm(emptyCreateForm());
    await load();
  }

  const showInstallments =
    form.payMethods.includes("card") &&
    (paymentProvider === "MERCADO_PAGO" || paymentProvider === "ASAAS");

  return (
    <div className="space-y-6">
      <AdminPageHeader
        action={
          <button type="button" className="btn-primary" onClick={openCreate}>
            + Criar produto
          </button>
        }
      >
        Monte o link de pagamento do produto: preço, Pix ou cartão, parcelas e o
        formulário que o cliente preenche antes de pagar.
      </AdminPageHeader>

      <CheckoutSubnav />

      {loading ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-muted">Nenhum produto cadastrado.</p>
      ) : (
        <ul className="space-y-3">
          {products.map((p) => {
            const slug = p.checkoutLinks[0]?.slug;
            return (
              <li
                key={p.id}
                className="surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${p.isActive ? "bg-success" : "bg-muted"}`}
                    />
                    <h2 className="font-semibold tracking-tight">{p.title}</h2>
                    {!p.isActive && (
                      <span className="rounded-full bg-muted-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                        Inativo · link fora do ar
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {formatBRL(p.priceCents)} · {p._count.orders} vendas
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {slug && (
                    <CopyLinkButton url={`${appUrl}/pay/${slug}`} />
                  )}
                  <Link href={`/app/checkout/produtos/${p.id}`} className="btn-secondary">
                    Editar
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={closeCreate}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-product-title"
            className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl shadow-black/15"
          >
            <form
              onSubmit={(e) => void createProduct(e)}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="border-b border-border px-5 py-4 sm:px-6">
                <h2
                  id="create-product-title"
                  className="text-lg font-semibold tracking-tight"
                >
                  Novo produto
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Título, valor, pagamento e formulário do link.
                </p>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
                {createError && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
                    {createError}
                  </p>
                )}

                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium">Título</span>
                  <input
                    required
                    autoFocus
                    className="input-field"
                    placeholder="Ex: Abertura de empresa"
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium">Descrição</span>
                  <textarea
                    className="input-field min-h-20"
                    placeholder="O que o cliente está comprando"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium">Preço</span>
                  <input
                    required
                    inputMode="numeric"
                    className="input-field max-w-xs"
                    placeholder="R$ 0,00"
                    value={form.price}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        price: maskBRLFromDigits(e.target.value),
                      })
                    }
                  />
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
                          checked={form.payMethods.includes(m.id)}
                          onChange={(e) =>
                            togglePayMethod(m.id, e.target.checked)
                          }
                        />
                        {m.label}
                      </li>
                    ))}
                  </ul>
                </div>

                {showInstallments && (
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium">
                      Parcelas no cartão
                    </span>
                    <p className="mb-1.5 text-xs text-muted">
                      Padrão do site:{" "}
                      {orgCardMaxInstallments === 1
                        ? "só à vista"
                        : `até ${orgCardMaxInstallments}x`}
                      .
                    </p>
                    <select
                      className="input-field max-w-xs"
                      value={
                        form.cardMaxInstallments == null
                          ? ""
                          : String(form.cardMaxInstallments)
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm({
                          ...form,
                          cardMaxInstallments:
                            v === "" ? null : Number(v) || 1,
                        });
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

                {CAKTO_ENABLED && paymentProvider === "CAKTO" && (
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium">
                      Cakto Offer ID (opcional)
                    </span>
                    <input
                      className="input-field"
                      value={form.caktoOfferId}
                      onChange={(e) =>
                        setForm({ ...form, caktoOfferId: e.target.value })
                      }
                    />
                  </label>
                )}

                <div>
                  <p className="mb-2 text-sm font-medium">Campos do formulário</p>
                  <p className="mb-2 text-xs text-muted">
                    Nome, e-mail, celular e CPF são obrigatórios para gerar a
                    cobrança (Pix/cartão).
                  </p>
                  <ul className="space-y-2">
                    {FIELD_PRESETS.filter((p) => p.preset).map((preset) => {
                      const field = form.formFields.find(
                        (f) => f.preset === preset.preset,
                      );
                      const locked = isCheckoutLockedPreset(preset.preset);
                      const enabled = locked || (field?.enabled ?? false);
                      return (
                        <li
                          key={preset.preset}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={enabled}
                            disabled={locked}
                            onChange={(e) =>
                              toggleField(preset.preset!, e.target.checked)
                            }
                          />
                          <span className="flex-1">{preset.label}</span>
                          {locked ? (
                            <span className="text-[11px] text-muted">
                              Obrigatório
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-border px-5 py-4 sm:px-6">
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary"
                >
                  {creating ? "Criando…" : "Criar produto"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={creating}
                  onClick={closeCreate}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
