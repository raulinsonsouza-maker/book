"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatBRL } from "@/lib/utils";
import { CheckoutSubnav } from "@/components/admin/CheckoutSubnav";

type Product = {
  id: string;
  title: string;
  description: string | null;
  priceCents: number;
  isActive: boolean;
  _count: { checkoutLinks: number; orders: number };
};

export default function CheckoutProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

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
    if (!title || Number.isNaN(priceCents)) return;
    setCreating(true);
    await fetch("/api/checkout/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, priceCents }),
    });
    setTitle("");
    setPrice("");
    setCreating(false);
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Checkout</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Produtos</h1>
        <p className="mt-2 text-sm text-muted">
          Cadastre produtos reutilizáveis para links de pagamento instantâneo.
        </p>
      </div>

      <CheckoutSubnav />

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
          {products.map((p) => (
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
                  {formatBRL(p.priceCents)} · {p._count.checkoutLinks} links ·{" "}
                  {p._count.orders} vendas
                </p>
              </div>
              <Link href={`/app/checkout/produtos/${p.id}`} className="btn-secondary">
                Editar
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
