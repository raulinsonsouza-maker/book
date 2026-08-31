"use client";

import { useEffect, useState } from "react";

type Config = {
  defaultTrialDays: number;
  supportEmail: string | null;
  billingBlockMessage: string | null;
};

export default function GerencialConfigPage() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/gerencial/config")
      .then((r) => r.json())
      .then(setCfg);
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!cfg) return;
    setMsg("");
    const res = await fetch("/api/gerencial/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    });
    setMsg(res.ok ? "Salvo" : "Erro ao salvar");
  }

  if (!cfg) return <p className="text-sm text-muted">Carregando…</p>;

  return (
    <form onSubmit={(e) => void save(e)} className="surface max-w-lg space-y-4 p-5">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Trial padrão (dias)</span>
        <input
          type="number"
          min={0}
          max={90}
          className="input-field"
          value={cfg.defaultTrialDays}
          onChange={(e) =>
            setCfg({ ...cfg, defaultTrialDays: parseInt(e.target.value, 10) || 0 })
          }
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">E-mail de suporte</span>
        <input
          type="email"
          className="input-field"
          value={cfg.supportEmail || ""}
          onChange={(e) => setCfg({ ...cfg, supportEmail: e.target.value })}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Mensagem ao bloquear conta</span>
        <textarea
          rows={3}
          className="input-field"
          value={cfg.billingBlockMessage || ""}
          onChange={(e) =>
            setCfg({ ...cfg, billingBlockMessage: e.target.value })
          }
        />
      </label>
      <button type="submit" className="btn-primary">
        Salvar
      </button>
      {msg && <p className="text-sm text-muted">{msg}</p>}
    </form>
  );
}
