"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { DeletePageButton } from "@/components/admin/DeletePageButton";
import { bookingPublicPath } from "@/lib/booking-page-slug";

type PageItem = {
  id: string;
  title: string;
  slug: string;
  isActive: boolean;
  _count: { services: number; bookings: number };
};

export default function PagesAdminPage() {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [orgSlug, setOrgSlug] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "";

  async function load() {
    const [pagesRes, orgRes] = await Promise.all([
      fetch("/api/pages"),
      fetch("/api/organization"),
    ]);
    const data = await pagesRes.json();
    const org = await orgRes.json();
    setPages(data);
    setOrgSlug(org.slug || "");
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createPage(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    const res = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setCreateError(data.error || "Não foi possível criar a agenda");
      return;
    }
    window.location.href = `/app/pages/${data.id}`;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Cada agenda tem serviços, horários e um link para o cliente marcar.
        Ao criar, um assistente guia a configuração passo a passo — nada fica
        aberto ao público até você definir horários.
      </p>

      <form
        onSubmit={createPage}
        className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
      >
        <input
          required
          placeholder="Nome da nova agenda"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input-field flex-1"
        />
        <button
          type="submit"
          disabled={creating}
          className="btn-primary whitespace-nowrap"
        >
          {creating ? "Criando…" : "Criar agenda"}
        </button>
      </form>
      {createError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-danger">
          {createError}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : pages.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma agenda criada.</p>
      ) : (
        <ul className="space-y-3">
          {pages.map((p) => {
            const path = orgSlug
              ? bookingPublicPath(orgSlug, p.slug)
              : `/p/${p.slug}`;
            return (
              <li
                key={p.id}
                className="surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        p.isActive ? "bg-success" : "bg-muted"
                      }`}
                    />
                    <h2 className="font-semibold tracking-tight">{p.title}</h2>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {p._count.services} serviços · {p._count.bookings}{" "}
                    agendamentos
                    {!p.isActive && " · link desativado"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.isActive && <CopyLinkButton url={`${appUrl}${path}`} />}
                  {p.isActive && (
                    <Link
                      href={path}
                      target="_blank"
                      className="btn-secondary !py-1.5 !text-xs"
                    >
                      Abrir
                    </Link>
                  )}
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
                    isActive={p.isActive}
                    onChanged={load}
                    compact
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
