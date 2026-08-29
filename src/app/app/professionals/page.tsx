"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WeekHoursSimple } from "@/components/availability/WeekHoursSimple";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Pro = {
  id: string;
  displayName: string;
  photoUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  email: string;
  serviceIds: string[];
  bookingsCount: number;
};

type ServiceOpt = { id: string; title: string; bookingPageId: string };

export default function ProfessionalsAdminPage() {
  const { confirm } = useConfirm();
  const [pros, setPros] = useState<Pro[]>([]);
  const [services, setServices] = useState<ServiceOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [salonMode, setSalonMode] = useState(false);
  const [msg, setMsg] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
    serviceIds: [] as string[],
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [editHours, setEditHours] = useState<
    { dayOfWeek: number; startTime: string; endTime: string }[]
  >([]);

  async function load() {
    const [pRes, pagesRes, orgRes] = await Promise.all([
      fetch("/api/professionals"),
      fetch("/api/pages"),
      fetch("/api/organization"),
    ]);
    if (orgRes.ok) {
      const org = await orgRes.json();
      setSalonMode(org.businessMode === "SALON");
    }
    if (pRes.ok) setPros(await pRes.json());
    if (pagesRes.ok) {
      const pages = await pagesRes.json();
      const svc: ServiceOpt[] = [];
      for (const page of pages) {
        const detail = await fetch(`/api/pages/${page.id}`);
        if (!detail.ok) continue;
        const d = await detail.json();
        for (const s of d.services || []) {
          if (s.isActive) {
            svc.push({
              id: s.id,
              title: `${s.title} (${page.title})`,
              bookingPageId: page.id,
            });
          }
        }
      }
      setServices(svc);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createPro(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMsg("");
    const res = await fetch("/api/professionals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setMsg(data.error || "Erro ao criar");
      return;
    }
    setForm({ displayName: "", email: "", password: "", serviceIds: [] });
    setMsg("Profissional criado");
    await load();
  }

  async function toggleActive(p: Pro) {
    await fetch(`/api/professionals/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    await load();
  }

  async function saveServices(p: Pro, serviceIds: string[]) {
    await fetch(`/api/professionals/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceIds }),
    });
    await load();
  }

  async function openHours(p: Pro) {
    const res = await fetch(`/api/professionals/${p.id}`);
    const data = await res.json();
    setEditId(p.id);
    setEditHours(data.availability || []);
  }

  async function removePro(p: Pro) {
    const ok = await confirm({
      title: p.bookingsCount > 0 ? "Desativar profissional?" : "Excluir profissional?",
      description:
        p.bookingsCount > 0
          ? "Há agendamentos no histórico. A conta será desativada."
          : "Isso remove o login e o cadastro.",
      confirmLabel: p.bookingsCount > 0 ? "Desativar" : "Excluir",
      tone: "danger",
    });
    if (!ok) return;
    await fetch(`/api/professionals/${p.id}`, { method: "DELETE" });
    await load();
  }

  if (loading) return <p className="text-sm text-muted">Carregando…</p>;

  if (!salonMode) {
    return (
      <div className="surface space-y-3 p-6">
        <h1 className="font-semibold tracking-tight">Modo Individual ativo</h1>
        <p className="text-sm text-muted">
          Para cadastrar profissionais, ative o{" "}
          <strong>Modo Salão</strong> em Conta.
        </p>
        <Link href="/app/settings" className="btn-primary inline-block !text-xs">
          Ir para Conta
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <p className="text-sm text-muted">
        Cadastre a equipe, vincule aos serviços e defina a agenda de cada
        profissional. Cada um tem login próprio.
      </p>

      {msg && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {msg}
        </p>
      )}

      <form onSubmit={createPro} className="surface space-y-3 p-5">
        <h2 className="font-semibold tracking-tight">Novo profissional</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Nome</span>
            <input
              required
              className="input-field"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">E-mail (login)</span>
            <input
              required
              type="email"
              className="input-field"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">Senha inicial</span>
            <input
              required
              type="password"
              minLength={6}
              className="input-field"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
        </div>
        {services.length > 0 && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Serviços que atende</legend>
            <div className="flex flex-wrap gap-2">
              {services.map((s) => {
                const on = form.serviceIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        serviceIds: on
                          ? form.serviceIds.filter((id) => id !== s.id)
                          : [...form.serviceIds, s.id],
                      })
                    }
                    className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
                      on
                        ? "bg-foreground text-white ring-foreground"
                        : "bg-white text-muted ring-border"
                    }`}
                  >
                    {s.title}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}
        <button type="submit" disabled={creating} className="btn-primary">
          {creating ? "Criando…" : "Criar profissional"}
        </button>
      </form>

      <ul className="space-y-3">
        {pros.map((p) => (
          <li key={p.id} className="surface space-y-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      p.isActive ? "bg-emerald-500" : "bg-muted"
                    }`}
                  />
                  <h3 className="font-semibold tracking-tight">{p.displayName}</h3>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {p.email} · {p.bookingsCount} agendamentos
                  {!p.isActive && " · inativo"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary !py-1.5 !text-xs"
                  onClick={() => openHours(p)}
                >
                  Horários
                </button>
                <button
                  type="button"
                  className="btn-secondary !py-1.5 !text-xs"
                  onClick={() => toggleActive(p)}
                >
                  {p.isActive ? "Desativar" : "Reativar"}
                </button>
                <button
                  type="button"
                  className="btn-secondary !py-1.5 !text-xs text-danger"
                  onClick={() => removePro(p)}
                >
                  Excluir
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {services.map((s) => {
                const on = p.serviceIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      const next = on
                        ? p.serviceIds.filter((id) => id !== s.id)
                        : [...p.serviceIds, s.id];
                      void saveServices(p, next);
                    }}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${
                      on
                        ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                        : "bg-muted-bg text-muted ring-border"
                    }`}
                  >
                    {s.title}
                  </button>
                );
              })}
            </div>

            {editId === p.id && (
              <div className="border-t border-border pt-4">
                <p className="mb-3 text-sm font-medium">Agenda de {p.displayName}</p>
                <WeekHoursSimple
                  professionalId={p.id}
                  initialRules={editHours}
                  onSaved={(rules) => setEditHours(rules)}
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      {pros.length === 0 && (
        <p className="text-sm text-muted">Nenhum profissional cadastrado ainda.</p>
      )}

      <p className="text-xs text-muted">
        <Link href="/app/settings" className="underline">
          Conta
        </Link>{" "}
        — o modo Salão precisa estar ativo.
      </p>
    </div>
  );
}
