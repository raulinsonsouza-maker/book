"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Org = {
  name: string;
};

export default function SettingsPage() {
  const [org, setOrg] = useState<Org | null>(null);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/organization")
      .then((r) => r.json())
      .then((data: Org) => {
        setOrg(data);
        setName(data.name);
      });
  }, []);

  async function saveOrg(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setOrg(await res.json());
    setSaving(false);
    setMsg("Dados salvos");
    setTimeout(() => setMsg(""), 2000);
  }

  if (!org) return <p className="text-sm text-muted">Carregando…</p>;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {msg && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {msg}
        </p>
      )}

      <p className="text-sm text-muted">
        Dados da sua empresa. Integrações ficam em{" "}
        <Link href="/app/integrations" className="font-medium text-foreground underline-offset-2 hover:underline">
          Integrações
        </Link>
        .
      </p>

      <form onSubmit={saveOrg} className="surface space-y-4 p-6">
        <h2 className="text-sm font-semibold tracking-tight">Empresa</h2>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Nome</span>
          <input
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Salvando…" : "Salvar empresa"}
        </button>
      </form>
    </div>
  );
}
