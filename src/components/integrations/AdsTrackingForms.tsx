"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { GoogleAdsIcon } from "@/components/icons/GoogleAdsIcon";
import { MetaIcon } from "@/components/icons/MetaIcon";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { useConfirm } from "@/components/ui/ConfirmDialog";

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

function ConnectModal({
  title,
  description,
  icon,
  onClose,
  children,
  footer,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] transition"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative z-10 w-full max-w-md animate-in overflow-hidden rounded-2xl border border-border bg-white shadow-2xl shadow-black/15"
      >
        <div className="px-5 pb-1 pt-5 sm:px-6 sm:pt-6">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-white">
              {icon}
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id={titleId}
                className="text-base font-semibold tracking-tight text-foreground"
              >
                {title}
              </h2>
              <p id={descId} className="mt-1 text-sm leading-relaxed text-muted">
                {description}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-5 py-4 sm:px-6">{children}</div>

        <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted-bg/40 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          {footer}
        </div>
      </div>
    </div>
  );
}

export function AdsTrackingForms({ org, onSaved, onMessage }: Props) {
  const { confirm } = useConfirm();
  const [metaOpen, setMetaOpen] = useState(false);
  const [googleOpen, setGoogleOpen] = useState(false);
  const [metaPixelId, setMetaPixelId] = useState("");
  const [metaToken, setMetaToken] = useState("");
  const [googleSendTo, setGoogleSendTo] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingGoogle, setSavingGoogle] = useState(false);

  useEffect(() => {
    if (!metaOpen || !org) return;
    setMetaPixelId(org.metaPixelId || "");
    setMetaToken("");
  }, [metaOpen, org?.metaPixelId]);

  useEffect(() => {
    if (!googleOpen || !org) return;
    setGoogleSendTo(org.googleAdsSendTo || "");
  }, [googleOpen, org?.googleAdsSendTo]);

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
    setMetaOpen(false);
    onMessage(
      data.metaConnected ? "Meta Ads conectado." : "Meta Ads removido.",
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
    setGoogleOpen(false);
    onMessage(
      data.googleAdsConnected
        ? "Google Ads conectado."
        : "Google Ads removido.",
    );
  }

  async function clearMeta() {
    const ok = await confirm({
      title: "Desconectar Meta Ads?",
      description: "O pixel deixa de disparar eventos na página pública.",
      confirmLabel: "Desconectar",
      cancelLabel: "Manter conectado",
      tone: "danger",
    });
    if (!ok) return;
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
    onSaved(data);
    onMessage("Meta Ads desconectado.");
  }

  async function clearGoogle() {
    const ok = await confirm({
      title: "Desconectar Google Ads?",
      description: "As conversões deixam de ser enviadas na página pública.",
      confirmLabel: "Desconectar",
      cancelLabel: "Manter conectado",
      tone: "danger",
    });
    if (!ok) return;
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
    onSaved(data);
    onMessage("Google Ads desconectado.");
  }

  return (
    <>
      <IntegrationCard
        icon={<MetaIcon size={28} />}
        title="Meta Ads"
        status={org?.metaConnected ? "Conectado" : "Não conectado"}
        statusVariant={org?.metaConnected ? "connected" : "disconnected"}
        description="Mede agendamentos e vendas nas campanhas do Meta."
        action={
          org?.metaConnected ? (
            <div className="space-y-2">
              {org.metaPixelId && (
                <p className="truncate text-xs text-muted">
                  Pixel: {org.metaPixelId}
                </p>
              )}
              <button
                type="button"
                disabled={savingMeta}
                onClick={() => setMetaOpen(true)}
                className="btn-secondary w-full"
              >
                Configurar
              </button>
              <button
                type="button"
                disabled={savingMeta}
                onClick={clearMeta}
                className="btn-secondary w-full text-danger"
              >
                Desconectar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setMetaOpen(true)}
              className="btn-primary w-full"
            >
              Conectar
            </button>
          )
        }
      />

      <IntegrationCard
        icon={<GoogleAdsIcon size={28} />}
        title="Google Ads"
        status={org?.googleAdsConnected ? "Conectado" : "Não conectado"}
        statusVariant={org?.googleAdsConnected ? "connected" : "disconnected"}
        description="Envia conversões com valor nas campanhas do Google."
        action={
          org?.googleAdsConnected ? (
            <div className="space-y-2">
              {org.googleAdsSendTo && (
                <p className="truncate text-xs text-muted">
                  {org.googleAdsSendTo}
                </p>
              )}
              <button
                type="button"
                disabled={savingGoogle}
                onClick={() => setGoogleOpen(true)}
                className="btn-secondary w-full"
              >
                Configurar
              </button>
              <button
                type="button"
                disabled={savingGoogle}
                onClick={clearGoogle}
                className="btn-secondary w-full text-danger"
              >
                Desconectar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setGoogleOpen(true)}
              className="btn-primary w-full"
            >
              Conectar
            </button>
          )
        }
      />

      {metaOpen && (
        <ConnectModal
          title="Conectar Meta Ads"
          description="Cole o ID do Pixel."
          icon={<MetaIcon size={24} />}
          onClose={() => setMetaOpen(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setMetaOpen(false)}
                className="btn-secondary w-full sm:w-auto"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingMeta || !metaPixelId.trim()}
                onClick={saveMeta}
                className="btn-primary w-full sm:w-auto"
              >
                {savingMeta ? "Salvando…" : "Salvar"}
              </button>
            </>
          }
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              ID do Pixel
            </label>
            <input
              className="input-field font-mono text-sm"
              placeholder="123456789012345"
              value={metaPixelId}
              onChange={(e) => setMetaPixelId(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Token da API{" "}
              <span className="font-normal text-muted">(opcional)</span>
            </label>
            <input
              className="input-field font-mono text-sm"
              type="password"
              placeholder={
                org?.hasMetaCapiToken
                  ? "Token salvo — cole outro para trocar"
                  : "Cole o access token"
              }
              value={metaToken}
              onChange={(e) => setMetaToken(e.target.value)}
              autoComplete="off"
            />
          </div>
        </ConnectModal>
      )}

      {googleOpen && (
        <ConnectModal
          title="Conectar Google Ads"
          description="Cole a tag de conversão."
          icon={<GoogleAdsIcon size={24} />}
          onClose={() => setGoogleOpen(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setGoogleOpen(false)}
                className="btn-secondary w-full sm:w-auto"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingGoogle || !googleSendTo.trim()}
                onClick={saveGoogle}
                className="btn-primary w-full sm:w-auto"
              >
                {savingGoogle ? "Salvando…" : "Salvar"}
              </button>
            </>
          }
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Tag de conversão
            </label>
            <input
              className="input-field font-mono text-sm"
              placeholder="AW-123456789/AbCdEfGh"
              value={googleSendTo}
              onChange={(e) => setGoogleSendTo(e.target.value)}
              autoComplete="off"
              autoFocus
              spellCheck={false}
            />
          </div>
        </ConnectModal>
      )}
    </>
  );
}
