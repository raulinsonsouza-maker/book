"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SignOutButton } from "@/components/admin/SignOutButton";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  match?: (path: string) => boolean;
};

function IconHome() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10h14V10" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
    </svg>
  );
}

function IconList() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function IconPages() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a2 2 0 012-2h12a2 2 0 012 2v14l-4-2-4 2-4-2-4 2V5z" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18v10H3V10zM3 10V7a2 2 0 012-2h14a2 2 0 012 2v3M16 14h.01" />
    </svg>
  );
}

function IconPlug() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22v-5M9 8V2M15 8V2M7 8h10a4 4 0 010 8h-2v2a2 2 0 11-4 0v-2H7a4 4 0 010-8z" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

const NAV: NavItem[] = [
  { href: "/app", label: "Painel", icon: <IconHome />, match: (p) => p === "/app" },
  {
    href: "/app/agenda/calendario",
    label: "Calendário",
    icon: <IconCalendar />,
    match: (p) => p.startsWith("/app/agenda/calendario"),
  },
  {
    href: "/app/agenda/listagem",
    label: "Agendamentos",
    icon: <IconList />,
    match: (p) => p.startsWith("/app/agenda/listagem") || p === "/app/bookings",
  },
  {
    href: "/app/pages",
    label: "Páginas",
    icon: <IconPages />,
    match: (p) => p.startsWith("/app/pages"),
  },
  {
    href: "/app/financeiro",
    label: "Financeiro",
    icon: <IconWallet />,
    match: (p) => p.startsWith("/app/financeiro"),
  },
  {
    href: "/app/integrations",
    label: "Integrações",
    icon: <IconPlug />,
    match: (p) => p.startsWith("/app/integrations"),
  },
  {
    href: "/app/settings",
    label: "Conta",
    icon: <IconSettings />,
    match: (p) => p.startsWith("/app/settings"),
  },
];

const PAGE_TITLES: { match: (p: string) => boolean; title: string }[] = [
  { match: (p) => p === "/app", title: "Painel" },
  { match: (p) => p.startsWith("/app/agenda/calendario"), title: "Calendário" },
  { match: (p) => p.startsWith("/app/agenda/listagem"), title: "Agendamentos" },
  { match: (p) => p.startsWith("/app/pages") && p.includes("/builder"), title: "Construtor de página" },
  { match: (p) => p.startsWith("/app/pages"), title: "Páginas" },
  { match: (p) => p.startsWith("/app/financeiro"), title: "Financeiro" },
  { match: (p) => p.startsWith("/app/integrations"), title: "Integrações" },
  { match: (p) => p.startsWith("/app/settings"), title: "Conta" },
];

function pageTitle(pathname: string) {
  return PAGE_TITLES.find((t) => t.match(pathname))?.title || "Book Symbius";
}

type Props = {
  organizationName?: string | null;
  userName?: string | null;
  children: React.ReactNode;
};

export function AppShell({ organizationName, userName, children }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isBuilder = pathname.includes("/builder");

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link
        href="/app"
        className="flex items-center gap-2 px-4 py-5 text-sm font-semibold tracking-tight"
        onClick={() => setMobileOpen(false)}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-[11px] font-bold text-white">
          B
        </span>
        Book Symbius
      </Link>
      <nav className="flex-1 space-y-0.5 px-2">
        {NAV.map((item) => {
          const active = item.match ? item.match(pathname) : pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`sidebar-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active ? "sidebar-link-active bg-muted-bg text-foreground" : "text-muted hover:bg-muted-bg hover:text-foreground"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-4">
        <p className="truncate text-xs font-medium">{organizationName || userName}</p>
        <p className="text-[10px] text-muted">Plano ativo</p>
      </div>
    </div>
  );

  return (
    <div className="admin-shell flex min-h-screen">
      <aside className="admin-sidebar hidden w-60 shrink-0 border-r border-border bg-white lg:block">
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="admin-sidebar relative z-50 h-full w-60 border-r border-border bg-white shadow-xl">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-border bg-white px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg border border-border p-2 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-base font-semibold tracking-tight">{pageTitle(pathname)}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted sm:inline">
              {organizationName || userName}
            </span>
            <SignOutButton />
          </div>
        </header>
        <main className={`admin-main flex-1 ${isBuilder ? "p-0" : "p-4 md:p-6 lg:p-8"}`}>
          <div className={isBuilder ? "h-full" : "mx-auto max-w-7xl"}>{children}</div>
        </main>
      </div>
    </div>
  );
}
