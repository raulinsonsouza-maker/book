"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MercadoPagoIcon } from "@/components/icons/MercadoPagoIcon";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { PasswordInput } from "@/components/ui/PasswordInput";

type Org = {
  mercadoPagoPublicKey: string | null;
  hasMercadoPagoToken: boolean;
  mercadoPagoConnected: boolean;
  mercadoPagoViaOAuth: boolean;
  mercadoPagoUserId: string | null;
  mercadoPagoOAuthConfigured: boolean;
  paymentProvider: "CAKTO" | "MERCADO_PAGO";
};

const MP_MSG: Record<string, string> = {
  connected: "Mercado Pago conectado com sucesso!",
  error: "Não foi possível conectar. Tente novamente.",
  forbidden: "Sessão inválida. Faça login e tente de novo.",
  missing_env:
    "OAuth não configurado no servidor. Use a configuração avançada ou contate o suporte.",
};

const POPUP_FEATURES =
  "popup=yes,width=520,height=720,left=100,top=100,scrollbars=yes,resizable=yes";

export default function MercadoPagoIntegrationPage() {
  const { confirm } = useConfirm();
  const [org, setOrg] = useState<Org | null>(null);
  const [accessToken, setAccessToken] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [msg, setMsg] = useState("");

  const loadOrg = useCallback(() => {
    fetch("/api/organization")
      .then((r) => r.json())
      .then((data: Org) => {
        setOrg(data);
        setPublicKey(data.mercadoPagoPublicKey || "");
      });
  }, []);

  const handleOAuthResult = useCallback(
    (status: string) => {
      setConnecting(false);
      setMsg(MP_MSG[status] || MP_MSG.error);
      if (status === "connected") loadOrg();
    },
    [loadOrg],
  );

  useEffect(() => {
    loadOrg();
    const mp = new URLSearchParams(window.location.search).get("mp");
    if (mp && MP_MSG[mp]) {
      handleOAuthResult(mp);
      window.history.replaceState({}, "", "/app/integracoes/mercadopago");
    }
  }, [loadOrg, handleOAuthResult]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "mercadopago-oauth") return;
      handleOAuthResult(String(event.data.status || "error"));
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [handleOAuthResult]);

  function connectMercadoPago() {
    setMsg("");
    setConnecting(true);

    const popup = window.open(
      "/api/mercadopago/connect?popup=1",
      "mercadopago-oauth",
      POPUP_FEATURES,
    );

    if (!popup) {
      window.open("/api/mercadopago/connect?popup=1", "_blank", "noopener,noreferrer");
      setConnecting(false);
      setMsg("Autorização aberta em nova guia. Volte aqui após concluir.");
      return;
    }

    const timer = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(timer);
        setConnecting((active) => {
          if (active) loadOrg();
          return false;
        });
      }
    }, 500);
  }

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
    const ok = await confirm({
      title: "Desconectar Mercado Pago?",
      description: "Pix e cartão via Mercado Pago param de funcionar até reconectar.",
      confirmLabel: "Desconectar",
      cancelLabel: "Manter conectado",
      tone: "danger",
    });
    if (!ok) return;
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
      <Link href="/app/integracoes" className="text-sm text-muted hover:text-foreground">
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
          <MercadoPagoIcon size={36} />
          <h2 className="text-lg font-semibold">Mercado Pago</h2>
        </div>
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
          <div className="space-y-2">
            <button
              type="button"
              onClick={connectMercadoPago}
              disabled={connecting}
              className="btn-primary w-full"
            >
              {connecting ? "Aguardando autorização…" : "Conectar com Mercado Pago"}
            </button>
            {connecting && (
              <p className="text-center text-xs text-muted">
                Uma janela do Mercado Pago foi aberta. Conclua a autorização e volte aqui.
              </p>
            )}
          </div>
        ) : (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Conexão automática indisponível no momento. Use a configuração avançada abaixo.
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
              <PasswordInput
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
