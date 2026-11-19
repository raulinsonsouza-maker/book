"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export type SettingsHubTab =
  | "perfil"
  | "negocio"
  | "integracoes"
  | "equipe";

const ALL_TABS: {
  id: SettingsHubTab;
  label: string;
  hint: string;
}[] = [
  { id: "perfil", label: "Perfil", hint: "Você e a sessão" },
  { id: "negocio", label: "Negócio", hint: "Marca e operação" },
  { id: "integracoes", label: "Integrações", hint: "Agenda e pagamentos" },
  { id: "equipe", label: "Acessos", hint: "Logins da equipe" },
];

export function useSettingsHubTab(
  allowed: SettingsHubTab[] = ["perfil", "negocio", "integracoes", "equipe"],
): SettingsHubTab {
  const searchParams = useSearchParams();
  const raw = searchParams.get("tab");
  if (raw === "perfil" || raw === "negocio" || raw === "integracoes" || raw === "equipe") {
    if (allowed.includes(raw)) return raw;
  }
  return allowed.includes("negocio") ? "negocio" : allowed[0]!;
}

export function SettingsHubNav({
  active,
  showEquipe,
}: {
  active: SettingsHubTab;
  showEquipe: boolean;
}) {
  const tabs = ALL_TABS.filter((t) => t.id !== "equipe" || showEquipe);

  return (
    <nav
      role="tablist"
      aria-label="Configurações"
      aria-orientation="vertical"
      className="settings-hub-rail"
    >
      {tabs.map((tab) => {
        const selected = active === tab.id;
        return (
          <Link
            key={tab.id}
            href={`/app/configuracoes?tab=${tab.id}`}
            role="tab"
            aria-selected={selected}
            className={`settings-hub-tab ${selected ? "is-active" : ""}`}
          >
            <span className="settings-hub-tab-label">{tab.label}</span>
            <span className="settings-hub-tab-hint">{tab.hint}</span>
          </Link>
        );
      })}
    </nav>
  );
}
