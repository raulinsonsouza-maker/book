"use client";

import { useEffect, useState } from "react";
import { WeekHoursSimple } from "@/components/availability/WeekHoursSimple";

type ProProfile = {
  id: string;
  displayName: string;
  photoUrl: string | null;
  email: string;
  availability: { dayOfWeek: number; startTime: string; endTime: string }[];
};

export default function ProfessionalProfilePage() {
  const [pro, setPro] = useState<ProProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/professionals/me")
      .then(async (r) => {
        if (!r.ok) throw new Error("forbidden");
        return r.json();
      })
      .then((data) => {
        setPro(data);
        setDisplayName(data.displayName);
        setLoading(false);
      })
      .catch(() => {
        setError("Perfil disponível apenas para contas de profissional.");
        setLoading(false);
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!pro) return;
    setSaving(true);
    setMsg("");
    const res = await fetch(`/api/professionals/${pro.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName,
        ...(password ? { password } : {}),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setMsg("Não foi possível salvar");
      return;
    }
    setPassword("");
    setMsg("Salvo");
  }

  if (loading) return <p className="text-sm text-muted">Carregando perfil…</p>;
  if (error || !pro) {
    return <p className="text-sm text-muted">{error || "Não encontrado"}</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {msg && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {msg}
        </p>
      )}

      <form onSubmit={save} className="surface space-y-4 p-5">
        <h2 className="font-semibold tracking-tight">Meus dados</h2>
        <p className="text-sm text-muted">{pro.email}</p>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Nome exibido</span>
          <input
            className="input-field"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            minLength={2}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Nova senha (opcional)</span>
          <input
            type="password"
            className="input-field"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </form>

      <section className="surface space-y-3 p-5">
        <h2 className="font-semibold tracking-tight">Meus horários</h2>
        <p className="text-sm text-muted">
          Estes horários definem quando você aparece disponível para os
          clientes.
        </p>
        <WeekHoursSimple
          professionalId={pro.id}
          initialRules={pro.availability}
        />
      </section>
    </div>
  );
}
