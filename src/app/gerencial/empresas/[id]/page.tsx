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
  createdAt: string;
  subscription: {
    id: string;
    status: string;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    plan: { id: string; name: string; priceCents: number } | null;
  } | null;
  owners: { name: string; email: string }[];
  counts: {
    services: number;
    bookings30d: number;
    professionals: number;
  };
  plans: { id: string; name: string; priceCents: number }[];
};

export default function GerencialEmpresaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Detail | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch(`/api/gerencial/organizations/${id}`);
    if (res.ok) setData(await res.json());
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function action(
    body: Record<string, string>,
  ) {
    setMsg("");
    const res = await fetch(`/api/gerencial/organizations/${id}`, {
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
      <Link href="/gerencial/empresas" className="text-sm text-muted hover:text-foreground">
        ← Empresas
      </Link>

      {msg && (
        <p className="rounded-lg border border-border bg-muted-bg px-4 py-2 text-sm">
          {msg}
        </p>
      )}

      <div className="surface space-y-3 p-5">
        <h2 className="text-lg font-semibold">{data.name}</h2>
        <p className="text-sm text-muted">/{data.slug} · {data.businessMode}</p>
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
        {data.subscription?.trialEndsAt && (
          <p className="text-sm text-muted">
            Trial até{" "}
            {new Date(data.subscription.trialEndsAt).toLocaleDateString("pt-BR")}
          </p>
        )}
        <div className="flex flex-wrap gap-4 text-sm text-muted">
          <span>{data.counts.services} serviços</span>
          <span>{data.counts.professionals} profissionais</span>
          <span>{data.counts.bookings30d} agendamentos (30d)</span>
        </div>
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
