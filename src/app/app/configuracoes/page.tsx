"use client";

import { Suspense, useEffect, useState } from "react";
import { EquipePanel } from "@/components/admin/EquipePanel";
import { IntegrationsPanel } from "@/components/admin/IntegrationsPanel";
import { NegocioPanel } from "@/components/admin/NegocioPanel";
import { PerfilPanel } from "@/components/admin/PerfilPanel";
import {
  SettingsHubNav,
  useSettingsHubTab,
  type SettingsHubTab,
} from "@/components/admin/SettingsHubNav";

function ConfiguracoesBody() {
  const [businessMode, setBusinessMode] = useState<"SOLO" | "SALON">("SOLO");
  const [ready, setReady] = useState(false);
  const showEquipe = businessMode === "SALON";
  const allowed: SettingsHubTab[] = showEquipe
    ? ["perfil", "negocio", "integracoes", "equipe"]
    : ["perfil", "negocio", "integracoes"];
  const tab = useSettingsHubTab(allowed);

  useEffect(() => {
    fetch("/api/organization")
      .then((r) => r.json())
      .then((data: { businessMode?: "SOLO" | "SALON" }) => {
        setBusinessMode(data.businessMode === "SALON" ? "SALON" : "SOLO");
      })
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return <p className="text-sm text-muted">Carregando…</p>;
  }

  return (
    <div className="settings-hub">
      <header className="settings-hub-header">
        <h1>Configurações</h1>
        <p>Conta, marca, pagamentos e acessos.</p>
      </header>

      <div className="settings-hub-layout">
        <SettingsHubNav active={tab} showEquipe={showEquipe} />
        <div className="settings-hub-panel" role="tabpanel">
          {tab === "perfil" ? <PerfilPanel /> : null}
          {tab === "negocio" ? <NegocioPanel /> : null}
          {tab === "integracoes" ? <IntegrationsPanel /> : null}
          {tab === "equipe" && showEquipe ? <EquipePanel /> : null}
        </div>
      </div>
    </div>
  );
}

export default function ConfiguracoesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
      <ConfiguracoesBody />
    </Suspense>
  );
}
