"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Org = {
  mercadoPagoPublicKey: string | null;
  hasMercadoPagoToken: boolean;
  mercadoPagoConnected: boolean;
  mercadoPagoViaOAuth: boolean;
  mercadoPagoUserId: string | null;
  mercadoPagoOAuthConfigured: boolean;
  mercadoPagoWebhookUrl: string;
  mercadoPagoRedirectUri: string;
  paymentProvider: "CAKTO" | "MERCADO_PAGO";
};

const MP_MSG: Record<string, string> = {
  connected: "Mercado Pago conectado com sucesso!",
  error: "Não foi possível conectar. Tente novamente.",
  forbidden: "Sessão inválida. Faça login e tente de novo.",
  missing_env:
    "OAuth não configurado no servidor. Adicione MERCADOPAGO_CLIENT_ID e MERCADOPAGO_CLIENT_SECRET no .env.",
};

export default function MercadoPagoIntegrationPage() {
  const [org, setOrg] = useState<Org | null>(null);
  const [accessToken, setAccessToken] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function loadOrg() {
    fetch("/api/organization")
      .then((r) => r.json())
      .then((data: Org) => {
        setOrg(data);
        setPublicKey(data.mercadoPagoPublicKey || "");
      });
  }

  useEffect(() => {
    loadOrg();
    const mp = new URLSearchParams(window.location.search).get("mp");
    if (mp && MP_MSG[mp]) {
      setMsg(MP_MSG[mp]);
      if (mp === "connected") loadOrg();
    }
  }, []);

  async function saveManual(e: React.FormEvent) {
    e.preventDefault();
    if (!publicKey.trim()) {
      setMsg("Preencha a Public Key");
      return;
    }
    if (!accessToken && !org?.hasMercadoPagoToken) {
      setMsg("Cole o Access Token");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentProvider: "MERCADO_PAGO",
        mercadoPagoPublicKey: publicKey.trim(),
        ...(accessToken ? { mercadoPagoAccessToken: accessToken.trim() } : {}),
      }),
    });
    const data = await res.json();
    setOrg(data);
    setAccessToken("");
    setSaving(false);
    setMsg(data.mercadoPagoConnected ? "Mercado Pago conectado (manual)" : "Salvo");
  }

  async function disconnect() {
    if (!confirm("Desconectar o Mercado Pago?")) return;
    setSaving(true);
    await fetch("/api/mercadopago/status", { method: "DELETE" });
    loadOrg();
    setPublicKey("");
    setSaving(false);
    setMsg("Mercado Pago desconectado");
  }

  if (!org) return <p className="text-sm text-muted">Carregando…</p>;

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
        <h2 className="text-lg font-semibold">Mercado Pago</h2>
        <p className="text-sm text-muted">
          Checkout transparente (Pix + cartão) dentro do funil de agendamento. Cada empresa
          conecta a própria conta Mercado Pago — o pagamento cai direto para você.
        </p>

        {org.mercadoPagoConnected ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <p className="font-medium">Conta conectada</p>
            {org.mercadoPagoUserId && (
              <p className="mt-1 text-xs">ID vendedor MP: {org.mercadoPagoUserId}</p>
            )}
            {org.mercadoPagoViaOAuth && (
              <p className="mt-1 text-xs">Conectado via autorização OAuth</p>
            )}
          </div>
        ) : org.mercadoPagoOAuthConfigured ? (
          <a href="/api/mercadopago/connect" className="btn-primary inline-block w-full text-center">
            Conectar com Mercado Pago
          </a>
        ) : (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            OAuth da plataforma ainda não configurado no servidor. Use a configuração
            avançada abaixo ou peça ao administrador para adicionar{" "}
            <code className="text-[10px]">MERCADOPAGO_CLIENT_ID</code> e{" "}
            <code className="text-[10px]">MERCADOPAGO_CLIENT_SECRET</code> no .env.
          </p>
        )}

        {org.mercadoPagoConnected && (
          <button
            type="button"
            onClick={disconnect}
            disabled={saving}
            className="btn-secondary text-danger w-full"
          >
            Desconectar
          </button>
        )}
      </div>

      <div className="surface space-y-3 p-6 text-xs text-muted">
        <p className="font-semibold text-foreground">Configuração única (Symbius / admin)</p>
        <p>No painel do app <strong>Book Symbius</strong> no Mercado Pago:</p>
        <ol className="list-decimal space-y-1 pl-4">
          <li>
            <strong>Redirect URL:</strong>{" "}
            <code className="break-all">{org.mercadoPagoRedirectUri}</code>
          </li>
          <li>
            <strong>Webhook:</strong>{" "}
            <code className="break-all">{org.mercadoPagoWebhookUrl}</code> (eventos: pagamentos)
          </li>
        </ol>
        <p className="pt-1">
          Use o <strong>Número da aplicação</strong> e o <strong>Client Secret</strong> (não
          confundir com Public Key / Access Token de produção) em{" "}
          <code>MERCADOPAGO_CLIENT_ID</code> e <code>MERCADOPAGO_CLIENT_SECRET</code> no .env
          da VPS.
        </p>
      </div>

      <div className="surface p-6">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="text-sm font-medium text-muted hover:text-foreground"
        >
          {showAdvanced ? "▼" : "▶"} Configuração avançada (colar tokens manualmente)
        </button>

        {showAdvanced && (
          <form onSubmit={saveManual} className="mt-4 space-y-4">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Access Token</span>
              <input
                type="password"
                className="input-field font-mono text-xs"
                placeholder={org.hasMercadoPagoToken ? "Deixe vazio para manter" : ""}
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Public Key</span>
              <input
                className="input-field font-mono text-xs"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
              />
            </label>
            <button type="submit" disabled={saving} className="btn-secondary">
              {saving ? "Salvando…" : "Salvar credenciais manualmente"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
