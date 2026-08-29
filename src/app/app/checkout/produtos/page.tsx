"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatBRL } from "@/lib/utils";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { CheckoutSubnav } from "@/components/admin/CheckoutSubnav";

type Product = {
  id: string;
  title: string;
  description: string | null;
  priceCents: number;
  isActive: boolean;
  checkoutLinks: { slug: string }[];
  _count: { orders: number };
};

export default function CheckoutProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
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
  }, []);

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    const priceCents = Math.round(parseFloat(price.replace(",", ".")) * 100);
    if (!title.trim()) {
      setCreateError("Informe o nome do produto");
      return;
    }
    if (Number.isNaN(priceCents) || priceCents < 0) {
      setCreateError("Informe um preço válido");
      return;
    }
    setCreating(true);
    setCreateError("");
    const res = await fetch("/api/checkout/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, priceCents }),
    });
    const data = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) {
      setCreateError(data.error || "Não foi possível criar o produto");
      return;
    }
    setTitle("");
    setPrice("");
    await load();
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Cadastre produtos e copie o link de pagamento para enviar ao cliente.
      </p>

      <CheckoutSubnav />

      {createError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-danger">
          {createError}
        </p>
      )}

      <form onSubmit={createProduct} className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm">
          <span className="mb-1.5 block font-medium">Nome do produto</span>
          <input
            required
            placeholder="Ex: Abertura de empresa"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field"
          />
        </label>
        <label className="w-full text-sm sm:w-40">
          <span className="mb-1.5 block font-medium">Preço (R$)</span>
          <input
            required
            placeholder="2000,00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="input-field"
          />
        </label>
        <button type="submit" disabled={creating} className="btn-primary whitespace-nowrap">
          {creating ? "Criando…" : "+ Criar produto"}
        </button>
      </form>

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
    </div>
  );
}
