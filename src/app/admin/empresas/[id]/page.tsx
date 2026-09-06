"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatBRL } from "@/lib/utils";

type Detail = {
  id: string;
  name: string;
  slug: string;
  subscriptionStatus: string;
  businessMode: string;
  whatsappEnabled: boolean;
  internalNote: string | null;
  notifyClientReminder: boolean;
  createdAt: string;
  subscription: {
    id: string;
    status: string;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    plan: {
      id: string;
      name: string;
      priceCents: number;
      whatsappQuotaMonthly?: number;
    } | null;
  } | null;
  owners: { name: string; email: string }[];
  counts: {
    services: number;
    bookings30d: number;
    professionals: number;
  };
  plans: { id: string; name: string; priceCents: number }[];
  whatsappUsage: {
    used: number;
    quota: number;
    remaining: number;
  };
};

export default function AdminEmpresaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Detail | null>(null);
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [note, setNote] = useState("");

  async function load() {
    const res = await fetch(`/api/admin/organizations/${id}`);
    if (!res.ok) return;
    const d = (await res.json()) as Detail;
    setData(d);
    setName(d.name);
    setSlug(d.slug);
    setNote(d.internalNote || "");
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function action(body: Record<string, unknown>) {
    setMsg("");
    const res = await fetch(`/api/admin/organizations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    if (!res.ok) {
      setMsg(d.error || "Erro");
      return;
    }
    setMsg("Atualizado");
    await load();
  }

  if (!data) return <p className="text-sm text-muted">Carregando…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/admin/empresas" className="text-sm text-muted hover:text-foreground">
        ← Empresas
      </Link>

      {msg && (
        <p className="rounded-lg border border-border bg-muted-bg px-4 py-2 text-sm">
          {msg}
        </p>
      )}

      <div className="surface space-y-3 p-5">
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="input-field"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn-secondary !text-xs"
          onClick={() => void action({ name, slug })}
        >
          Salvar nome/slug
        </button>
        <p className="text-sm">
          Status: <strong>{data.subscriptionStatus}</strong>
          {data.subscription?.plan && (
            <>
              {" "}
              · {data.subscription.plan.name} (
              {formatBRL(data.subscription.plan.priceCents)}/mês)
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-4 text-sm text-muted">
          <span>{data.counts.services} serviços</span>
          <span>{data.counts.professionals} profissionais</span>
          <span>{data.counts.bookings30d} agendamentos (30d)</span>
        </div>
        <p className="text-sm">
          WhatsApp mês:{" "}
          <strong>
            {data.whatsappUsage.used} / {data.whatsappUsage.quota}
          </strong>
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={data.whatsappEnabled}
            onChange={(e) =>
              void action({ whatsappEnabled: e.target.checked })
            }
          />
          WhatsApp liberado para esta empresa
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={data.notifyClientReminder}
            onChange={(e) =>
              void action({ notifyClientReminder: e.target.checked })
            }
          />
          Lembretes ao cliente
        </label>
        <textarea
          className="input-field"
          rows={2}
          placeholder="Nota interna"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          type="button"
          className="btn-secondary !text-xs"
          onClick={() => void action({ internalNote: note || null })}
        >
          Salvar nota
        </button>
      </div>

      <div className="surface space-y-3 p-5">
        <h3 className="font-semibold">Responsáveis</h3>
        <ul className="space-y-1 text-sm">
          {data.owners.map((o) => (
            <li key={o.email}>
              {o.name} · {o.email}
            </li>
          ))}
        </ul>
      </div>

      <div className="surface space-y-3 p-5">
        <h3 className="font-semibold">Ações</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary !text-xs"
            onClick={() => void action({ action: "suspend" })}
          >
            Suspender
          </button>
          <button
            type="button"
            className="btn-secondary !text-xs"
            onClick={() => void action({ action: "activate" })}
          >
            Reativar (cortesia)
          </button>
          <button
            type="button"
            className="btn-secondary !text-xs"
            onClick={() => void action({ action: "trial" })}
          >
            Reiniciar trial (14d)
          </button>
        </div>
        {data.plans.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <select
              id="plan-select"
              className="input-field max-w-xs !py-1.5 text-sm"
              defaultValue={data.subscription?.plan?.id ?? ""}
            >
              {data.plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatBRL(p.priceCents)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-primary !text-xs"
              onClick={() => {
                const el = document.getElementById(
                  "plan-select",
                ) as HTMLSelectElement;
                void action({ action: "set_plan", planId: el.value });
              }}
            >
              Aplicar plano
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
