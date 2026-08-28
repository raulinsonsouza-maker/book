"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatBRL } from "@/lib/utils";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { CheckoutSubnav } from "@/components/admin/CheckoutSubnav";

type ProductOption = { id: string; title: string; priceCents: number; isActive: boolean };

type CheckoutLink = {
  id: string;
  slug: string;
  title: string | null;
  isActive: boolean;
  product: { id: string; title: string; priceCents: number };
  _count: { orders: number };
};

export default function CheckoutLinksPage() {
  const [links, setLinks] = useState<CheckoutLink[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productId, setProductId] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "";

  async function load() {
    const [linksRes, productsRes] = await Promise.all([
      fetch("/api/checkout/links"),
      fetch("/api/checkout/products"),
    ]);
    const linksData = await linksRes.json();
    const productsData = await productsRes.json();
    setLinks(Array.isArray(linksData) ? linksData : []);
    setProducts(Array.isArray(productsData) ? productsData.filter((p: ProductOption) => p.isActive) : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createLink(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) return;
    setCreating(true);
    await fetch("/api/checkout/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    setProductId("");
    setCreating(false);
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Checkout</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Links de pagamento</h1>
        <p className="mt-2 text-sm text-muted">
          Gere links fixos a partir dos produtos e envie para seus clientes.
        </p>
      </div>

      <CheckoutSubnav />

      <form onSubmit={createLink} className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm">
          <span className="mb-1.5 block font-medium">Produto</span>
          <select
            required
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="input-field"
          >
            <option value="">Selecione…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} — {formatBRL(p.priceCents)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={creating || products.length === 0} className="btn-primary whitespace-nowrap">
          {creating ? "Criando…" : "+ Criar link"}
        </button>
      </form>

      {products.length === 0 && !loading && (
        <p className="text-sm text-muted">
          Cadastre um produto primeiro em{" "}
          <Link href="/app/checkout/produtos" className="underline">
            Produtos
          </Link>
          .
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : links.length === 0 ? (
        <p className="text-sm text-muted">Nenhum link criado.</p>
      ) : (
        <ul className="space-y-3">
          {links.map((link) => (
            <li
              key={link.id}
              className="surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${link.isActive ? "bg-success" : "bg-muted"}`}
                  />
                  <h2 className="font-semibold tracking-tight">
                    {link.title || link.product.title}
                  </h2>
                </div>
                <p className="mt-1 text-sm text-muted">
                  /pay/{link.slug} · {formatBRL(link.product.priceCents)} ·{" "}
                  {link._count.orders} vendas
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <CopyLinkButton url={`${appUrl}/pay/${link.slug}`} />
                <Link href={`/app/checkout/links/${link.id}`} className="btn-secondary">
                  Editar
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
