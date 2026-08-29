"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AsaasIcon } from "@/components/icons/AsaasIcon";
import { ASAAS_ENABLED } from "@/lib/feature-flags";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Status = {
  connected: boolean;
  email: string | null;
  walletId: string | null;
  webhookUrl: string;
};

export default function AsaasIntegrationPage() {
  const router = useRouter();
  const { confirm } = useConfirm();
  const [status, setStatus] = useState<Status | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!ASAAS_ENABLED) {
      router.replace("/app/integrations");
      return;
    }
    fetch("/api/asaas/status")
      .then((r) => r.json())
      .then(setStatus);
  }, [router]);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey.trim()) {
      setMsg("Cole a API Key do Asaas");
      return;
    }
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/asaas/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: apiKey.trim() }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMsg(data.error || "Não foi possível conectar");
      return;
    }
    setApiKey("");
    setStatus({
      connected: true,
      email: data.email,
      walletId: data.walletId,
      webhookUrl: status?.webhookUrl || "",
    });
    setMsg("Asaas conectado com sucesso");
  }

  async function disconnect() {
    const ok = await confirm({
      title: "Desconectar Asaas?",
      description: "Pagamentos via Asaas param de funcionar até reconectar.",
      confirmLabel: "Desconectar",
      cancelLabel: "Manter conectado",
      tone: "danger",
    });
    if (!ok) return;
    setSaving(true);
    await fetch("/api/asaas/status", { method: "DELETE" });
    setStatus((s) =>
      s
        ? { ...s, connected: false, email: null, walletId: null }
        : null,
    );
    setSaving(false);
    setMsg("Asaas desconectado");
  }

  if (!ASAAS_ENABLED) return null;
  if (!status) return <p className="text-sm text-muted">Carregando…</p>;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/app/integrations" className="text-sm text-muted hover:text-foreground">
        ← Integrações
      </Link>

      {msg && (
        <p
          className={`rounded-lg border px-4 py-2 text-sm ${
            msg.includes("sucesso") || msg.includes("conectado")
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {msg}
        </p>
      )}

      <div className="surface space-y-4 p-6">
        <div className="flex items-center gap-3">
          <AsaasIcon size={36} />
          <h2 className="text-lg font-semibold">Asaas</h2>
        </div>
        <p className="text-sm text-muted">
          Conecte com a API Key da sua conta Asaas. Validamos automaticamente e
          configuramos o webhook para confirmar Pix e cartão.
        </p>

        {status.connected ? (
          <>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <p className="font-medium">Conta conectada</p>
              {status.email && <p className="mt-1 text-xs">{status.email}</p>}
              {status.walletId && (
                <p className="mt-1 text-xs">Carteira: {status.walletId}</p>
              )}
            </div>
            <button
              type="button"
              onClick={disconnect}
              disabled={saving}
              className="btn-secondary w-full text-danger"
            >
              Desconectar
            </button>
          </>
        ) : (
          <form onSubmit={connect} className="space-y-4">
            <ol className="space-y-1 text-xs text-muted">
              <li>
                1. Abra{" "}
                <a
                  href="https://www.asaas.com"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  asaas.com
                </a>{" "}
                → Integrações → Chave de API
              </li>
              <li>2. Gere uma chave e cole abaixo (aparece só uma vez)</li>
              <li>3. Clique em Conectar — validamos e ativamos como padrão</li>
            </ol>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">API Key</span>
              <input
                type="password"
                className="input-field font-mono text-xs"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="$aact_prod_..."
                autoComplete="off"
              />
            </label>
            <button type="submit" disabled={saving} className="btn-primary w-full">
              {saving ? "Validando…" : "Conectar Asaas"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
