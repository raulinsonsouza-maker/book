"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

/** @deprecated Prefer SettingsHubNav — mantido para compat. */
const TABS = [
  {
    id: "conta",
    label: "Negócio",
    href: "/app/configuracoes?tab=negocio",
    hint: "Marca e operação",
  },
  {
    id: "equipe",
    label: "Acessos",
    href: "/app/configuracoes?tab=equipe",
    hint: "Logins da equipe",
  },
] as const;

export type SettingsTab = (typeof TABS)[number]["id"];

export function useSettingsTab(): SettingsTab {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  return tab === "equipe" ? "equipe" : "conta";
}

export function SettingsTabs({ active }: { active: SettingsTab }) {
  return (
    <div
      role="tablist"
      aria-label="Configurações"
      className="settings-tabs settings-tabs-visual"
    >
      {TABS.map((tab) => {
        const selected = active === tab.id;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            role="tab"
            aria-selected={selected}
            className={`settings-tab settings-tab-visual ${
              selected ? "is-active" : ""
            }`}
          >
            <span className="settings-tab-label">{tab.label}</span>
            <span className="settings-tab-hint">{tab.hint}</span>
          </Link>
        );
      })}
    </div>
  );
}
