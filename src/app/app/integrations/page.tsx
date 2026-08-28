"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GoogleCalendarIcon } from "@/components/icons/GoogleCalendarIcon";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";

type Org = {
  caktoConnected: boolean;
};

type GoogleStatus = {
  configured: boolean;
  connected: boolean;
  email: string | null;
};

export default function IntegrationsPage() {
  const [org, setOrg] = useState<Org | null>(null);
  const [google, setGoogle] = useState<GoogleStatus | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/organization")
      .then((r) => r.json())
      .then(setOrg);
    fetch("/api/google/status")
      .then((r) => r.json())
      .then(setGoogle);

    const g = new URLSearchParams(window.location.search).get("google");
    if (g === "connected") {
      setMsg("Google Agenda conectada com sucesso");
      fetch("/api/google/status")
        .then((r) => r.json())
        .then(setGoogle);
    }
  }, []);

  async function disconnectGoogle() {
    if (!confirm("Desconectar o Google Agenda?")) return;
    await fetch("/api/google/status", { method: "DELETE" });
    setGoogle((g) =>
      g ? { ...g, connected: false, email: null } : null,
    );
    setMsg("Google Agenda desconectada");
  }

  return (
    <div className="space-y-6">
      {msg && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {msg}
        </p>
      )}

      <p className="text-sm text-muted">
        Conecte serviços externos para sincronizar agenda e receber pagamentos.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <IntegrationCard
          icon={<GoogleCalendarIcon size={28} />}
          title="Google Calendar"
          status={google?.connected ? "Conectado" : "Não conectado"}
          statusVariant={google?.connected ? "connected" : "disconnected"}
          description="Sincronize reservas confirmadas com sua agenda. Horários ocupados no Google bloqueiam slots no funil."
          action={
            google?.connected ? (
              <div className="space-y-2">
                <p className="truncate text-xs text-muted">{google.email}</p>
                <button
                  type="button"
                  onClick={disconnectGoogle}
                  className="btn-secondary w-full text-danger"
                >
                  Desconectar
                </button>
              </div>
            ) : (
              <a href="/api/google/connect" className="btn-primary w-full">
                Conectar
              </a>
            )
          }
        />

        <IntegrationCard
          icon={
            <span className="text-lg font-bold tracking-tight text-emerald-600">C</span>
          }
          title="Cakto"
          status={org?.caktoConnected ? "Conectada" : "Modo demo"}
          statusVariant={org?.caktoConnected ? "connected" : "demo"}
          description="Cobrança via Pix e cartão no checkout transparente do funil de agendamento."
          action={
            <Link href="/app/integrations/cakto" className="btn-primary w-full">
              {org?.caktoConnected ? "Configurar" : "Conectar"}
            </Link>
          }
        />

        <IntegrationCard
          icon={
            <span className="text-xs font-semibold text-muted">API</span>
          }
          title="API & Webhooks"
          status="Em breve"
          statusVariant="disconnected"
          description="Integração via API REST e eventos em tempo real."
          action={
            <button type="button" disabled className="btn-secondary w-full opacity-50">
              Em breve
            </button>
          }
        />
      </div>

      <div className="rounded-lg border border-time-border bg-time-bg/50 px-4 py-3 text-sm text-muted">
        Documentação OAuth: cadastre{" "}
        <code className="text-xs">/api/auth/callback/google</code> e{" "}
        <code className="text-xs">/api/google/callback</code> no Google Cloud Console.
      </div>
    </div>
  );
}
