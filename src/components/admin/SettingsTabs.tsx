"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const TABS = [
  {
    id: "conta",
    label: "Conta",
    href: "/app/conta",
    hint: "Marca e preferências",
  },
  {
    id: "equipe",
    label: "Equipe",
    href: "/app/conta?tab=equipe",
    hint: "Acessos e permissões",
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
