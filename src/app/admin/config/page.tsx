"use client";

import { useCallback, useEffect, useState } from "react";
import { MercadoPagoIcon } from "@/components/icons/MercadoPagoIcon";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { PasswordInput } from "@/components/ui/PasswordInput";

type Config = {
  defaultTrialDays: number;
  supportEmail: string | null;
  billingBlockMessage: string | null;
};

type MpStatus = {
  billingEnabled: boolean;
  clientId: string | null;
  hasClientSecret: boolean;
  clientSecretMasked: string | null;
  hasAccessToken: boolean;
  accessTokenMasked: string | null;
  publicKey: string | null;
  userId: string | null;
  nickname: string | null;
  connectedAt: string | null;
  lastError: string | null;
  oauthAppReady: boolean;
  connected: boolean;
  redirectUriTenant: string;
  redirectUriPlatform: string;
  webhookUrl: string;
  ping: {
    ok: boolean;
    userId?: number;
    nickname?: string;
    error?: string;
  } | null;
};

const MP_MSG: Record<string, string> = {
  connected: "Mercado Pago conectado com sucesso!",
  error: "Não foi possível conectar. Tente novamente.",
  forbidden: "Sessão inválida. Faça login e tente de novo.",
  missing_env:
    "OAuth não configurado. Salve Client ID e Client Secret na configuração avançada.",
};

const POPUP_FEATURES =
  "popup=yes,width=520,height=720,left=100,top=100,scrollbars=yes,resizable=yes";

export default function AdminConfigPage() {
  const { confirm } = useConfirm();
  const [cfg, setCfg] = useState<Config | null>(null);
  const [mp, setMp] = useState<MpStatus | null>(null);
  const [msg, setMsg] = useState("");
  const [mpMsg, setMpMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [publicKey, setPublicKey] = useState("");

  const loadMp = useCallback(async () => {
    const res = await fetch("/api/admin/mercadopago");
    if (!res.ok) return;
    const data = (await res.json()) as MpStatus;
    setMp(data);
    setClientId(data.clientId || "");
    setPublicKey(data.publicKey || "");
  }, []);

  const handleOAuthResult = useCallback(
    (status: string) => {
      setConnecting(false);
      setMpMsg(MP_MSG[status] || MP_MSG.error);
      if (status === "connected") void loadMp();
    },
    [loadMp],
  );

  useEffect(() => {
    fetch("/api/admin/config")
      .then((r) => r.json())
      .then(setCfg);
    void loadMp();
  }, [loadMp]);

  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("mp");
    if (status && MP_MSG[status]) {
      handleOAuthResult(status);
      window.history.replaceState({}, "", "/admin/config");
    }
  }, [handleOAuthResult]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "platform-mercadopago-oauth") return;
      handleOAuthResult(String(event.data.status || "error"));
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [handleOAuthResult]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!cfg) return;
    setMsg("");
    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    });
    setMsg(res.ok ? "Salvo" : "Erro ao salvar");
  }

  async function saveMp(patch: Record<string, unknown>, successMsg?: string) {
    setBusy(true);
    setMpMsg("");
    const res = await fetch("/api/admin/mercadopago", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setBusy(false);
    if (!res.ok) {
      setMpMsg("Erro ao salvar Mercado Pago");
      return;
    }
    setClientSecret("");
    setAccessToken("");
    setMpMsg(successMsg || "Salvo");
    const data = (await res.json()) as MpStatus;
    setMp(data);
    setClientId(data.clientId || "");
    setPublicKey(data.publicKey || "");
  }

  function connectMercadoPago() {
    setMpMsg("");
    setConnecting(true);
    const popup = window.open(
      "/api/admin/mercadopago/connect?popup=1",
      "platform-mercadopago-oauth",
      POPUP_FEATURES,
    );
    if (!popup) {
      window.open(
        "/api/admin/mercadopago/connect?popup=1",
        "_blank",
        "noopener,noreferrer",
      );
      setConnecting(false);
      setMpMsg("Autorização aberta em nova guia. Volte aqui após concluir.");
      return;
    }
    const timer = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(timer);
        setConnecting((active) => {
          if (active) void loadMp();
          return false;
        });
      }
    }, 500);
  }

  async function saveManual(e: React.FormEvent) {
    e.preventDefault();
    if (!publicKey.trim()) {
      setMpMsg("Preencha a Public Key");
      return;
    }
    if (!accessToken && !mp?.hasAccessToken) {
      setMpMsg("Cole o Access Token");
      return;
    }
    await saveMp(
      {
        publicKey: publicKey.trim(),
        ...(accessToken.trim() ? { accessToken: accessToken.trim() } : {}),
        billingEnabled: true,
      },
      "Mercado Pago conectado (manual)",
    );
  }

  async function disconnect() {
    const ok = await confirm({
      title: "Desconectar Mercado Pago?",
      description:
        "A cobrança de assinaturas do Book Symbius para até reconectar a conta.",
      confirmLabel: "Desconectar",
      cancelLabel: "Manter conectado",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    const res = await fetch("/api/admin/mercadopago", { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      const data = (await res.json()) as MpStatus;
      setMp(data);
      setPublicKey("");
      setAccessToken("");
      setMpMsg("Mercado Pago desconectado");
    } else {
      const data = await res.json().catch(() => ({}));
      setMpMsg(
        typeof data.error === "string"
          ? data.error
          : "Erro ao desconectar",
      );
    }
  }

  if (!cfg) return <p className="text-sm text-muted">Carregando…</p>;

  const connectedLabel =
    mp?.ping?.nickname || mp?.nickname || null;
  const connectedUserId = mp?.ping?.userId || mp?.userId || null;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <form onSubmit={(e) => void save(e)} className="surface space-y-4 p-5">
        <h2 className="font-semibold">Geral</h2>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Trial padrão (dias)</span>
          <input
            type="number"
            min={0}
            max={90}
            className="input-field"
            value={cfg.defaultTrialDays}
            onChange={(e) =>
              setCfg({
                ...cfg,
                defaultTrialDays: parseInt(e.target.value, 10) || 0,
              })
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

      {mpMsg && (
        <p
          className={`rounded-lg border px-4 py-2 text-sm ${
            mpMsg.includes("sucesso") ||
            mpMsg.toLowerCase().includes("conectado")
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {mpMsg}
        </p>
      )}

      <div className="surface space-y-4 p-6">
        <div className="flex items-center gap-3">
          <MercadoPagoIcon size={36} />
          <h2 className="text-lg font-semibold">Mercado Pago</h2>
        </div>
        <p className="text-sm text-muted">
          Conta que recebe as assinaturas do Book Symbius. O mesmo app OAuth
          também permite que os salões conectem o próprio Mercado Pago.
        </p>

        {mp && (
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={mp.billingEnabled}
              disabled={busy || !mp.connected}
              onChange={(e) =>
                void saveMp(
                  { billingEnabled: e.target.checked },
                  e.target.checked
                    ? "Cobrança de assinaturas ativada"
                    : "Cobrança de assinaturas desativada",
                )
              }
            />
            Cobrança de assinaturas ativa
          </label>
        )}

        {mp?.connected ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <p className="font-medium">
              Conta conectada
              {connectedLabel ? ` — ${connectedLabel}` : ""}
            </p>
            {connectedUserId && (
              <p className="mt-1 text-xs">ID vendedor MP: {connectedUserId}</p>
            )}
            {mp.ping?.ok === false && (
              <p className="mt-1 text-xs text-amber-800">
                Credenciais salvas, mas o ping falhou
                {mp.ping.error ? `: ${mp.ping.error}` : "."}
              </p>
            )}
          </div>
        ) : mp?.oauthAppReady ? (
          <div className="space-y-2">
            {mp.lastError && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Último erro: {mp.lastError}
              </p>
            )}
            <button
              type="button"
              onClick={connectMercadoPago}
              disabled={connecting || busy}
              className="btn-primary w-full"
            >
              {connecting
                ? "Aguardando autorização…"
                : "Conectar com Mercado Pago"}
            </button>
            {connecting && (
              <p className="text-center text-xs text-muted">
                Uma janela do Mercado Pago foi aberta. Conclua a autorização e
                volte aqui.
              </p>
            )}
          </div>
        ) : (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Conexão automática indisponível. Configure Client ID e Client Secret
            na seção avançada abaixo.
            {mp?.lastError ? ` Último erro: ${mp.lastError}` : ""}
          </p>
        )}

        {mp?.connected && (
          <button
            type="button"
            onClick={() => void disconnect()}
            disabled={busy}
            className="btn-secondary w-full text-danger"
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
          {showAdvanced ? "▼" : "▶"} Configuração avançada
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-6">
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void saveMp(
                  {
                    clientId: clientId.trim() || null,
                    ...(clientSecret.trim()
                      ? { clientSecret: clientSecret.trim() }
                      : {}),
                  },
                  "App OAuth salvo",
                );
              }}
            >
              <p className="text-xs text-muted">
                Credenciais do app no Mercado Pago Developers (Client ID /
                Secret). Necessárias para o OAuth da plataforma e dos salões.
              </p>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">Client ID</span>
                <input
                  className="input-field font-mono text-xs"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">
                  Client Secret{" "}
                  {mp?.clientSecretMasked && (
                    <span className="font-normal text-muted">
                      ({mp.clientSecretMasked})
                    </span>
                  )}
                </span>
                <PasswordInput
                  className="input-field font-mono text-xs"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder={
                    mp?.hasClientSecret
                      ? "Deixe vazio para manter"
                      : "Cole o secret"
                  }
                  autoComplete="off"
                />
              </label>
              <button type="submit" disabled={busy} className="btn-secondary">
                {busy ? "Salvando…" : "Salvar app OAuth"}
              </button>
              <div className="space-y-1 break-all rounded-lg border border-border bg-zinc-50 px-3 py-2 text-[11px] text-muted">
                <p>Redirect salões: {mp?.redirectUriTenant}</p>
                <p>Redirect plataforma: {mp?.redirectUriPlatform}</p>
                <p>Webhook: {mp?.webhookUrl}</p>
              </div>
            </form>

            <form onSubmit={(e) => void saveManual(e)} className="space-y-4 border-t border-border pt-4">
              <p className="text-xs text-muted">
                Colar tokens de produção manualmente (alternativa ao OAuth).
              </p>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">Access Token</span>
                <PasswordInput
                  className="input-field font-mono text-xs"
                  placeholder={
                    mp?.hasAccessToken ? "Deixe vazio para manter" : ""
                  }
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
              <button type="submit" disabled={busy} className="btn-secondary">
                {busy ? "Salvando…" : "Salvar credenciais manualmente"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
