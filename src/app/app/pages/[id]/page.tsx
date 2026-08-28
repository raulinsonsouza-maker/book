"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DeletePageButton } from "@/components/admin/DeletePageButton";
import {
  formatBRL,
  maskBRLFromDigits,
  maskMinutes,
  parseBRLMaskToCents,
  slugify,
} from "@/lib/utils";
import { CAKTO_ENABLED } from "@/lib/feature-flags";

type CustomField = {
  id?: string;
  label: string;
  type: string;
  required: boolean;
};

type Service = {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  caktoOfferId: string | null;
  isActive: boolean;
  customFields: CustomField[];
};

type PageData = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  accentColor: string;
  websiteUrl: string | null;
  instagram: string | null;
  timezone: string;
  services: Service[];
};

export default function PageEditor() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [page, setPage] = useState<PageData | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<"CAKTO" | "MERCADO_PAGO">("CAKTO");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [svcForm, setSvcForm] = useState({
    title: "",
    description: "",
    durationMinutes: "30",
    priceMasked: "R$\u00a0390,00",
  });

  async function load() {
    const res = await fetch(`/api/pages/${id}`);
    if (!res.ok) {
      router.push("/app/pages");
      return;
    }
    setPage(await res.json());
  }

  useEffect(() => {
    load();
    fetch("/api/organization")
      .then((r) => r.json())
      .then((data) => setPaymentProvider(data.paymentProvider || "CAKTO"));
  }, [id]);

  async function savePage(e: React.FormEvent) {
    e.preventDefault();
    if (!page) return;
    setSaving(true);
    const res = await fetch(`/api/pages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: page.title,
        description: page.description,
        accentColor: page.accentColor,
        websiteUrl: page.websiteUrl,
        instagram: page.instagram,
      }),
    });
    if (res.ok) {
      setPage(await res.json());
    }
    setSaving(false);
    setMsg("Página salva");
    setTimeout(() => setMsg(""), 2000);
  }

  async function addService(e: React.FormEvent) {
    e.preventDefault();
    if (!page) return;
    const duration = Math.max(5, parseInt(svcForm.durationMinutes || "0", 10) || 0);
    const priceCents = parseBRLMaskToCents(svcForm.priceMasked);
    if (!duration) return;
    await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingPageId: page.id,
        title: svcForm.title,
        description: svcForm.description,
        durationMinutes: duration,
        priceCents,
        customFields: [
          {
            label: "Conte brevemente sua situação",
            type: "TEXTAREA",
            required: true,
          },
        ],
      }),
    });
    setSvcForm({
      title: "",
      description: "",
      durationMinutes: "30",
      priceMasked: "R$\u00a0390,00",
    });
    await load();
  }

  async function updateService(svc: Service, patch: Partial<Service>) {
    await fetch(`/api/services/${svc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await load();
  }

  if (!page) {
    return <p className="text-sm text-muted">Carregando…</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/app/pages" className="text-sm text-muted hover:text-foreground">
            ← Páginas
          </Link>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            {page.title}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/app/pages/${page.id}/builder`}
            className="btn-secondary"
          >
            Personalizar página
          </Link>
          <Link
            href={`/app/pages/${page.id}/availability`}
            className="btn-secondary"
          >
            Horários
          </Link>
          <Link
            href={`/p/${page.slug}`}
            target="_blank"
            className="btn-primary"
          >
            Ver funil público
          </Link>
          <DeletePageButton
            pageId={page.id}
            pageTitle={page.title}
            redirectTo="/app/pages"
          />
        </div>
      </div>

      {msg && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {msg}
        </p>
      )}

      <form
        onSubmit={savePage}
        className="surface space-y-4 p-6"
      >
        <h2 className="font-semibold">Branding e dados</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block font-medium">Título</span>
            <input
              className="input-field"
              value={page.title}
              onChange={(e) => setPage({ ...page, title: e.target.value })}
            />
            <p className="mt-1.5 text-xs text-muted">
              Link público:{" "}
              <code className="rounded bg-muted-bg px-1.5 py-0.5 text-foreground">
                /p/{slugify(page.title) || page.slug}
              </code>
            </p>
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block font-medium">Descrição</span>
            <textarea
              rows={3}
              className="input-field"
              value={page.description || ""}
              onChange={(e) =>
                setPage({ ...page, description: e.target.value })
              }
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Cor de destaque</span>
            <input
              type="color"
              className="h-10 w-full rounded-xl border border-border"
              value={page.accentColor}
              onChange={(e) =>
                setPage({ ...page, accentColor: e.target.value })
              }
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Site</span>
            <input
              className="input-field"
              value={page.websiteUrl || ""}
              onChange={(e) =>
                setPage({ ...page, websiteUrl: e.target.value })
              }
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Instagram</span>
            <input
              className="input-field"
              value={page.instagram || ""}
              onChange={(e) => setPage({ ...page, instagram: e.target.value })}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="btn-primary"
        >
          Salvar página
        </button>
      </form>

      <section className="surface flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h2 className="font-semibold tracking-tight">Disponibilidade</h2>
          <p className="mt-1 text-sm text-muted">
            Configure períodos (manhã/tarde), preview de slots e exceções.
          </p>
        </div>
        <Link href={`/app/pages/${page.id}/availability`} className="btn-primary">
          Configurar horários
        </Link>
      </section>

      <section className="surface space-y-4 p-6">
        <h2 className="font-semibold tracking-tight">Serviços</h2>
        <ul className="space-y-3">
          {page.services.map((svc) => (
            <li
              key={svc.id}
              className={`rounded-lg border p-4 ${
                svc.isActive
                  ? "border-money-border bg-white"
                  : "border-warn-border bg-warn-bg/40"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold tracking-tight">{svc.title}</p>
                    <span
                      className={svc.isActive ? "tag tag-active" : "tag tag-inactive"}
                    >
                      {svc.isActive ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="tag tag-time">
                      {svc.durationMinutes} min
                    </span>
                    <span className="tag tag-money">
                      {formatBRL(svc.priceCents)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateService(svc, { isActive: !svc.isActive })
                  }
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    svc.isActive
                      ? "border border-warn-border bg-warn-bg text-warn hover:bg-amber-100"
                      : "border border-money-border bg-money-bg text-money hover:bg-emerald-100"
                  }`}
                >
                  {svc.isActive ? "Desativar" : "Ativar"}
                </button>
              </div>
              {CAKTO_ENABLED && paymentProvider === "CAKTO" && (
                <>
                  <p className="mt-3 text-xs text-muted">
                    Oferta Cakto: usa a oferta padrão da integração. Opcional
                    abaixo para sobrescrever neste serviço.
                  </p>
                  <label className="mt-2 block text-sm">
                    <span className="mb-1 block text-muted">
                      Oferta específica (opcional)
                    </span>
                    <input
                      className="input-field"
                      defaultValue={svc.caktoOfferId || ""}
                      placeholder="Deixe vazio para usar a padrão"
                      onBlur={(e) =>
                        updateService(svc, {
                          caktoOfferId: e.target.value || null,
                        } as Partial<Service>)
                      }
                    />
                  </label>
                </>
              )}
            </li>
          ))}
        </ul>

        <form
          onSubmit={addService}
          className="space-y-3 rounded-lg border border-dashed border-border bg-muted-bg/40 p-4"
        >
          <h3 className="text-sm font-semibold tracking-tight">Novo serviço</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm md:col-span-2">
              <span className="mb-1.5 block font-medium">Nome do serviço</span>
              <input
                required
                placeholder="Ex.: Consultoria estratégica"
                className="input-field"
                value={svcForm.title}
                onChange={(e) =>
                  setSvcForm({ ...svcForm, title: e.target.value })
                }
              />
            </label>

            <label className="field-time block text-sm">
              <span className="mb-1.5 flex items-center gap-2 font-medium text-time">
                Duração
                <span className="tag tag-time">tempo</span>
              </span>
              <div className="relative">
                <input
                  required
                  inputMode="numeric"
                  placeholder="30"
                  className="input-field pr-14"
                  value={svcForm.durationMinutes}
                  onChange={(e) =>
                    setSvcForm({
                      ...svcForm,
                      durationMinutes: maskMinutes(e.target.value),
                    })
                  }
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-time">
                  min
                </span>
              </div>
            </label>

            <label className="field-money block text-sm">
              <span className="mb-1.5 flex items-center gap-2 font-medium text-money">
                Preço
                <span className="tag tag-money">valor</span>
              </span>
              <input
                required
                inputMode="numeric"
                placeholder="R$ 0,00"
                className="input-field"
                value={svcForm.priceMasked}
                onChange={(e) =>
                  setSvcForm({
                    ...svcForm,
                    priceMasked: maskBRLFromDigits(e.target.value),
                  })
                }
              />
            </label>

            <label className="block text-sm md:col-span-2">
              <span className="mb-1.5 block font-medium">Descrição</span>
              <textarea
                placeholder="O que está incluso neste atendimento"
                className="input-field"
                rows={3}
                value={svcForm.description}
                onChange={(e) =>
                  setSvcForm({ ...svcForm, description: e.target.value })
                }
              />
            </label>
          </div>
          <button type="submit" className="btn-primary">
            Adicionar serviço
          </button>
        </form>
      </section>
    </div>
  );
}
