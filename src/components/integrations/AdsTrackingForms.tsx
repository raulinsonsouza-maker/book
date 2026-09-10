"use client";

import { useEffect, useState } from "react";
import { GoogleAdsIcon } from "@/components/icons/GoogleAdsIcon";
import { MetaIcon } from "@/components/icons/MetaIcon";

type TrackingOrg = {
  metaPixelId: string | null;
  metaCapiTokenMasked: string | null;
  hasMetaCapiToken: boolean;
  metaConnected: boolean;
  googleAdsSendTo: string | null;
  googleAdsConnected: boolean;
};

type Props = {
  org: TrackingOrg | null;
  onSaved: (org: TrackingOrg & Record<string, unknown>) => void;
  onMessage: (msg: string, tone?: "ok" | "err") => void;
};

export function AdsTrackingForms({ org, onSaved, onMessage }: Props) {
  const [metaPixelId, setMetaPixelId] = useState("");
  const [metaToken, setMetaToken] = useState("");
  const [googleSendTo, setGoogleSendTo] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingGoogle, setSavingGoogle] = useState(false);

  useEffect(() => {
    if (!org) return;
    setMetaPixelId(org.metaPixelId || "");
    setMetaToken("");
    setGoogleSendTo(org.googleAdsSendTo || "");
  }, [org?.metaPixelId, org?.googleAdsSendTo, org?.hasMetaCapiToken]);

  async function saveMeta() {
    setSavingMeta(true);
    const body: Record<string, string | null> = {
      metaPixelId: metaPixelId.trim() || null,
    };
    if (metaToken.trim()) {
      body.metaCapiAccessToken = metaToken.trim();
    } else if (!metaPixelId.trim()) {
      body.metaCapiAccessToken = null;
    }
    const res = await fetch("/api/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSavingMeta(false);
    if (!res.ok) {
      onMessage(data.error || "Não foi possível salvar o Meta", "err");
      return;
    }
    setMetaToken("");
    onSaved(data);
    onMessage(
      data.metaConnected
        ? "Meta Ads salvo. Eventos serão enviados na página pública."
        : "Meta Ads removido.",
    );
  }

  async function saveGoogle() {
    setSavingGoogle(true);
    const res = await fetch("/api/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        googleAdsSendTo: googleSendTo.trim() || null,
      }),
    });
    const data = await res.json();
    setSavingGoogle(false);
    if (!res.ok) {
      onMessage(data.error || "Não foi possível salvar o Google Ads", "err");
      return;
    }
    onSaved(data);
    onMessage(
      data.googleAdsConnected
        ? "Google Ads salvo. Conversões serão enviadas na página pública."
        : "Google Ads removido.",
    );
  }

  async function clearMeta() {
    setSavingMeta(true);
    const res = await fetch("/api/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metaPixelId: null,
        metaCapiAccessToken: null,
      }),
    });
    const data = await res.json();
    setSavingMeta(false);
    if (!res.ok) {
      onMessage(data.error || "Não foi possível remover o Meta", "err");
      return;
    }
    setMetaPixelId("");
    setMetaToken("");
    onSaved(data);
    onMessage("Meta Ads removido.");
  }

  async function clearGoogle() {
    setSavingGoogle(true);
    const res = await fetch("/api/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ googleAdsSendTo: null }),
    });
    const data = await res.json();
    setSavingGoogle(false);
    if (!res.ok) {
      onMessage(data.error || "Não foi possível remover o Google Ads", "err");
      return;
    }
    setGoogleSendTo("");
    onSaved(data);
    onMessage("Google Ads removido.");
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight">
          Rastreamento de anúncios
        </h2>
        <p className="mt-1 text-sm text-muted">
          Cole os códigos das suas campanhas. Medimos agendamentos e vendas
          automaticamente na página pública (com valor quando houver pagamento).
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="integration-card flex flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-white">
              <MetaIcon size={28} />
            </div>
            <span
              className={`tag shrink-0 ${
                org?.metaConnected
                  ? "!bg-emerald-50 !text-emerald-700"
                  : "!bg-muted-bg !text-muted"
              }`}
            >
              {org?.metaConnected ? "Conectado" : "Não conectado"}
            </span>
          </div>
          <h3 className="mt-4 text-base font-semibold tracking-tight">Meta Ads</h3>
          <p className="mt-2 text-sm text-muted">
            Pixel + API de conversões (CAPI) para fechar o ciclo no Gerenciador
            de Eventos.
          </p>

          <label className="mt-4 block text-xs font-medium text-muted">
            ID do Pixel
          </label>
          <input
            className="input mt-1"
            placeholder="123456789012345"
            value={metaPixelId}
            onChange={(e) => setMetaPixelId(e.target.value)}
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-muted">
            Events Manager → Fontes de dados → seu Pixel. Pode colar o snippet
            inteiro.
          </p>

          <label className="mt-3 block text-xs font-medium text-muted">
            Token da API de conversões
          </label>
          <input
            className="input mt-1"
            type="password"
            placeholder={
              org?.hasMetaCapiToken
                ? org.metaCapiTokenMasked || "Token salvo — cole outro para trocar"
                : "Cole o token de acesso"
            }
            value={metaToken}
            onChange={(e) => setMetaToken(e.target.value)}
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-muted">
            Events Manager → Configurações → API de conversões → Gerar token.
            Opcional, mas melhora a atribuição.
          </p>

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              disabled={savingMeta}
              onClick={saveMeta}
              className="btn-primary w-full"
            >
              {savingMeta ? "Salvando…" : "Salvar Meta"}
            </button>
            {org?.metaConnected && (
              <button
                type="button"
                disabled={savingMeta}
                onClick={clearMeta}
                className="btn-secondary w-full text-danger"
              >
                Remover
              </button>
            )}
          </div>
          <p className="mt-3 text-xs text-muted">
            O pixel processa dados dos visitantes da sua página pública (LGPD:
            responsabilidade do anunciante).
          </p>
        </div>

        <div className="integration-card flex flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-white">
              <GoogleAdsIcon size={28} />
            </div>
            <span
              className={`tag shrink-0 ${
                org?.googleAdsConnected
                  ? "!bg-emerald-50 !text-emerald-700"
                  : "!bg-muted-bg !text-muted"
              }`}
            >
              {org?.googleAdsConnected ? "Conectado" : "Não conectado"}
            </span>
          </div>
          <h3 className="mt-4 text-base font-semibold tracking-tight">
            Google Ads
          </h3>
          <p className="mt-2 text-sm text-muted">
            Conversão com valor no pagamento confirmado (Enhanced Conversions
            automático).
          </p>

          <label className="mt-4 block text-xs font-medium text-muted">
            Código de conversão
          </label>
          <input
            className="input mt-1"
            placeholder="AW-123456789/AbCdEfGhIjKlMn"
            value={googleSendTo}
            onChange={(e) => setGoogleSendTo(e.target.value)}
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-muted">
            Google Ads → Metas → Conversões → sua conversão → Tag → copie o ID
            no formato AW-…/….
          </p>

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              disabled={savingGoogle}
              onClick={saveGoogle}
              className="btn-primary w-full"
            >
              {savingGoogle ? "Salvando…" : "Salvar Google"}
            </button>
            {org?.googleAdsConnected && (
              <button
                type="button"
                disabled={savingGoogle}
                onClick={clearGoogle}
                className="btn-secondary w-full text-danger"
              >
                Remover
              </button>
            )}
          </div>
          <p className="mt-3 text-xs text-muted">
            Usamos e-mail/telefone do cliente (hash) para Enhanced Conversions,
            sem configuração extra.
          </p>
        </div>
      </div>
    </div>
  );
}
