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
  whatsappQuotaMonthly: number;
};

export default function AdminPlanosPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    priceMasked: centsToBRLMask(9900),
    trialDays: "14",
    whatsappQuota: "200",
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState({
    name: "",
    priceMasked: "",
    trialDays: "",
    whatsappQuota: "",
    mpPreapprovalPlanId: "",
  });
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch("/api/admin/plans");
    if (res.ok) setPlans(await res.json());
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/admin/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        slug: form.slug,
        priceCents: parseBRLMaskToCents(form.priceMasked),
        trialDays: parseInt(form.trialDays, 10) || 14,
        whatsappQuotaMonthly: parseInt(form.whatsappQuota, 10) || 200,
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
      whatsappQuota: "200",
    });
    await load();
  }

  async function toggle(p: Plan) {
    await fetch(`/api/admin/plans/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    await load();
  }

  function startEdit(p: Plan) {
    setEditId(p.id);
    setEdit({
      name: p.name,
      priceMasked: centsToBRLMask(p.priceCents),
      trialDays: String(p.trialDays),
      whatsappQuota: String(p.whatsappQuotaMonthly ?? 200),
      mpPreapprovalPlanId: p.mpPreapprovalPlanId || "",
    });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    await fetch(`/api/admin/plans/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: edit.name,
        priceCents: parseBRLMaskToCents(edit.priceMasked),
        trialDays: parseInt(edit.trialDays, 10) || 0,
        whatsappQuotaMonthly: parseInt(edit.whatsappQuota, 10) || 0,
        mpPreapprovalPlanId: edit.mpPreapprovalPlanId.trim() || null,
      }),
    });
    setEditId(null);
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
            placeholder="Trial dias"
            value={form.trialDays}
            onChange={(e) => setForm({ ...form, trialDays: e.target.value })}
          />
          <input
            required
            type="number"
            min={0}
            className="input-field sm:col-span-2"
            placeholder="Cota WhatsApp / mês"
            value={form.whatsappQuota}
            onChange={(e) => setForm({ ...form, whatsappQuota: e.target.value })}
          />
        </div>
        <button type="submit" className="btn-primary">
          Criar plano
        </button>
        {msg && <p className="text-sm text-danger">{msg}</p>}
      </form>

      <ul className="space-y-2">
        {plans.map((p) => (
          <li key={p.id} className="surface p-4">
            {editId === p.id ? (
              <form onSubmit={(e) => void saveEdit(e)} className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    className="input-field"
                    value={edit.name}
                    onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  />
                  <input
                    className="input-field"
                    value={edit.priceMasked}
                    onChange={(e) =>
                      setEdit({
                        ...edit,
                        priceMasked: maskBRLFromDigits(e.target.value),
                      })
                    }
                  />
                  <input
                    type="number"
                    className="input-field"
                    value={edit.trialDays}
                    onChange={(e) =>
                      setEdit({ ...edit, trialDays: e.target.value })
                    }
                  />
                  <input
                    type="number"
                    className="input-field"
                    placeholder="Cota WA"
                    value={edit.whatsappQuota}
                    onChange={(e) =>
                      setEdit({ ...edit, whatsappQuota: e.target.value })
                    }
                  />
                  <input
                    className="input-field sm:col-span-2"
                    placeholder="mpPreapprovalPlanId"
                    value={edit.mpPreapprovalPlanId}
                    onChange={(e) =>
                      setEdit({ ...edit, mpPreapprovalPlanId: e.target.value })
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary !text-xs">
                    Salvar
                  </button>
                  <button
                    type="button"
                    className="btn-secondary !text-xs"
                    onClick={() => setEditId(null)}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm text-muted">
                    {formatBRL(p.priceCents)}/mês · trial {p.trialDays}d ·{" "}
                    {p.whatsappQuotaMonthly ?? 200} msgs WA
                    {!p.isActive && " · inativo"}
                  </p>
                  {p.mpPreapprovalPlanId && (
                    <p className="text-xs text-muted">
                      MP: {p.mpPreapprovalPlanId}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary !text-xs"
                    onClick={() => startEdit(p)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn-secondary !text-xs"
                    onClick={() => void toggle(p)}
                  >
                    {p.isActive ? "Desativar" : "Ativar"}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
