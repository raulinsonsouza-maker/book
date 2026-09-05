"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const TABS = [
  { id: "conta", label: "Conta", href: "/app/conta" },
  { id: "equipe", label: "Equipe", href: "/app/conta?tab=equipe" },
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
      className="flex gap-1 rounded-xl border border-border bg-muted-bg/60 p-1"
    >
      {TABS.map((tab) => {
        const selected = active === tab.id;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            role="tab"
            aria-selected={selected}
            className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium transition ${
              selected
                ? "bg-white text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
