"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatBRL } from "@/lib/utils";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { CheckoutSubnav } from "@/components/admin/CheckoutSubnav";

type CheckoutLink = {
  id: string;
  slug: string;
  title: string | null;
  logoUrl: string | null;
  accentColor: string | null;
  isActive: boolean;
  product: { title: string; priceCents: number };
};

export default function EditCheckoutLinkPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [link, setLink] = useState<CheckoutLink | null>(null);
  const [title, setTitle] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [accentColor, setAccentColor] = useState("#0a0a0a");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "";

  useEffect(() => {
    fetch(`/api/checkout/links/${id}`)
      .then((r) => r.json())
      .then((data: CheckoutLink) => {
        setLink(data);
        setTitle(data.title || "");
        setLogoUrl(data.logoUrl || "");
        setAccentColor(data.accentColor || "#0a0a0a");
        setIsActive(data.isActive);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/checkout/links/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title || null,
        logoUrl: logoUrl || null,
        accentColor,
        isActive,
      }),
    });
    setSaving(false);
  }

  async function remove() {
    if (!confirm("Excluir este link?")) return;
    await fetch(`/api/checkout/links/${id}`, { method: "DELETE" });
    router.push("/app/checkout/links");
  }

  if (loading) return <p className="text-sm text-muted">Carregando…</p>;
  if (!link) return <p className="text-sm text-danger">Link não encontrado.</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/checkout/links" className="text-sm text-muted hover:text-foreground">
          ← Links
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          {link.title || link.product.title}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {formatBRL(link.product.priceCents)} · /pay/{link.slug}
        </p>
      </div>

      <CheckoutSubnav />

      <div className="flex flex-wrap gap-2">
        <CopyLinkButton url={`${appUrl}/pay/${link.slug}`} />
      </div>

      <form onSubmit={save} className="surface max-w-2xl space-y-4 p-6">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Título na tela (opcional)</span>
          <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={link.product.title} />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Logo URL (opcional)</span>
          <input className="input-field" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Cor de destaque</span>
          <input type="color" className="h-10 w-20 cursor-pointer rounded border border-border" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Link ativo
        </label>
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
