"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { DeletePageButton } from "@/components/admin/DeletePageButton";

type PageItem = {
  id: string;
  title: string;
  slug: string;
  isActive: boolean;
  _count: { services: number; bookings: number };
};

export default function PagesAdminPage() {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "";

  async function load() {
    const res = await fetch("/api/pages");
    const data = await res.json();
    setPages(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createPage(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setTitle("");
    setCreating(false);
    await load();
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Páginas</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
          Páginas de agendamento
        </h1>
        <p className="mt-2 text-sm text-muted">
          Cada página tem serviços, disponibilidade e link público.
        </p>
      </div>

      <form onSubmit={createPage} className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <input
          required
          placeholder="Nome da nova página"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input-field flex-1"
        />
        <button type="submit" disabled={creating} className="btn-primary whitespace-nowrap">
          {creating ? "Criando…" : "+ Criar página"}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : pages.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma página criada.</p>
      ) : (
        <ul className="space-y-3">
          {pages.map((p) => (
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
                  {p._count.services} serviços · {p._count.bookings} agendamentos
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <CopyLinkButton url={`${appUrl}/p/${p.slug}`} />
                <Link
                  href={`/p/${p.slug}`}
                  target="_blank"
                  className="btn-secondary !py-1.5 !text-xs"
                >
                  Abrir
                </Link>
                <Link
                  href={`/app/pages/${p.id}/builder`}
                  className="btn-secondary !py-1.5 !text-xs"
                >
                  Personalizar
                </Link>
                <Link
                  href={`/app/pages/${p.id}`}
                  className="btn-primary !py-1.5 !text-xs"
                >
                  Editar
                </Link>
                <DeletePageButton
                  pageId={p.id}
                  pageTitle={p.title}
                  bookingsCount={p._count.bookings}
                  onDeleted={load}
                  compact
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
