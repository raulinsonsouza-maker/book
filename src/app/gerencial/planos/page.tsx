"use client";

import { useEffect, useState } from "react";
import {
  centsToBRLMask,
  formatBRL,
  maskBRLFromDigits,
  parseBRLMaskToCents,
} from "@/lib/utils";

type Plan = {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  trialDays: number;
  isActive: boolean;
  mpPreapprovalPlanId: string | null;
};

export default function GerencialPlanosPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    priceMasked: centsToBRLMask(9900),
    trialDays: "14",
  });
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch("/api/gerencial/plans");
    if (res.ok) setPlans(await res.json());
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/gerencial/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        slug: form.slug,
        priceCents: parseBRLMaskToCents(form.priceMasked),
        trialDays: parseInt(form.trialDays, 10) || 14,
      }),
    });
    const d = await res.json();
    if (!res.ok) {
      setMsg(d.error || "Erro");
      return;
    }
    setForm({
      name: "",
      slug: "",
      priceMasked: centsToBRLMask(9900),
      trialDays: "14",
    });
    await load();
  }

  async function toggle(p: Plan) {
    await fetch(`/api/gerencial/plans/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={(e) => void create(e)} className="surface space-y-3 p-5">
        <h2 className="font-semibold">Novo plano</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            required
            placeholder="Nome"
            className="input-field"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            required
            placeholder="slug (ex: essencial)"
            className="input-field"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
          <input
            required
            className="input-field"
            value={form.priceMasked}
            onChange={(e) =>
              setForm({ ...form, priceMasked: maskBRLFromDigits(e.target.value) })
            }
          />
          <input
            required
            type="number"
            min={0}
            className="input-field"
            value={form.trialDays}
            onChange={(e) => setForm({ ...form, trialDays: e.target.value })}
          />
        </div>
        <button type="submit" className="btn-primary">
          Criar plano
        </button>
        {msg && <p className="text-sm text-danger">{msg}</p>}
      </form>

      <ul className="space-y-2">
        {plans.map((p) => (
          <li
            key={p.id}
            className="surface flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div>
              <p className="font-semibold">{p.name}</p>
              <p className="text-sm text-muted">
                {formatBRL(p.priceCents)}/mês · trial {p.trialDays}d
                {!p.isActive && " · inativo"}
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary !text-xs"
              onClick={() => void toggle(p)}
            >
              {p.isActive ? "Desativar" : "Ativar"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
