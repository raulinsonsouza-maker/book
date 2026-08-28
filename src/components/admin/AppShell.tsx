"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { SignOutButton } from "@/components/admin/SignOutButton";
import {
  NavIconAccount,
  NavIconBookings,
  NavIconCalendar,
  NavIconCheckout,
  NavIconFinance,
  NavIconHome,
  NavIconIntegrations,
  NavIconMenu,
  NavIconPages,
} from "@/components/admin/NavIcons";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match?: (path: string) => boolean;
};

type NavSection = {
  title?: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Principal",
    items: [
      { href: "/app", label: "Painel", icon: NavIconHome, match: (p) => p === "/app" },
      {
        href: "/app/agenda/calendario",
        label: "Calendário",
        icon: NavIconCalendar,
        match: (p) => p.startsWith("/app/agenda/calendario"),
      },
      {
        href: "/app/agenda/listagem",
        label: "Agendamentos",
        icon: NavIconBookings,
        match: (p) => p.startsWith("/app/agenda/listagem") || p === "/app/bookings",
      },
    ],
  },
  {
    title: "Gestão",
    items: [
      {
        href: "/app/pages",
        label: "Páginas",
        icon: NavIconPages,
        match: (p) => p.startsWith("/app/pages"),
      },
      {
        href: "/app/checkout/produtos",
        label: "Checkout",
        icon: NavIconCheckout,
        match: (p) => p.startsWith("/app/checkout"),
      },
      {
        href: "/app/financeiro",
        label: "Financeiro",
        icon: NavIconFinance,
        match: (p) => p.startsWith("/app/financeiro"),
      },
    ],
  },
  {
    title: "Conta",
    items: [
      {
        href: "/app/integrations",
        label: "Integrações",
        icon: NavIconIntegrations,
        match: (p) => p.startsWith("/app/integrations"),
      },
      {
        href: "/app/settings",
        label: "Conta",
        icon: NavIconAccount,
        match: (p) => p.startsWith("/app/settings"),
      },
    ],
  },
];

const PAGE_TITLES: { match: (p: string) => boolean; title: string }[] = [
  { match: (p) => p === "/app", title: "Painel" },
  { match: (p) => p.startsWith("/app/agenda/calendario"), title: "Calendário" },
  { match: (p) => p.startsWith("/app/agenda/listagem"), title: "Agendamentos" },
  { match: (p) => p.startsWith("/app/pages") && p.includes("/builder"), title: "Construtor de página" },
  { match: (p) => p.startsWith("/app/pages"), title: "Páginas" },
  { match: (p) => p.startsWith("/app/checkout/vendas"), title: "Vendas" },
  { match: (p) => p.startsWith("/app/checkout/produtos"), title: "Produtos" },
  { match: (p) => p.startsWith("/app/checkout"), title: "Checkout" },
  { match: (p) => p.startsWith("/app/financeiro"), title: "Financeiro" },
  { match: (p) => p.startsWith("/app/integrations"), title: "Integrações" },
  { match: (p) => p.startsWith("/app/settings"), title: "Conta" },
];

function pageTitle(pathname: string) {
  return PAGE_TITLES.find((t) => t.match(pathname))?.title || "Book Symbius";
}

function initials(name?: string | null) {
  if (!name) return "B";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function SidebarNavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const active = item.match ? item.match(pathname) : pathname === item.href;
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`sidebar-link group ${active ? "sidebar-link-active" : ""}`}
    >
      <span className={`sidebar-icon ${active ? "sidebar-icon-active" : ""}`}>
        <Icon />
      </span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
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
  const displayName = organizationName || userName || "Sua conta";

  const closeMobile = () => setMobileOpen(false);

  const sidebar = (
    <div className="flex h-full flex-col">
      <BrandLogo
        href="/app"
        size="sm"
        showText
        subtitle="Agendamento"
        className="sidebar-brand admin-topbar"
        onClick={closeMobile}
      />

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            {section.title && (
              <p className="sidebar-section-label">{section.title}</p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <SidebarNavLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onNavigate={closeMobile}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="flex min-w-0 items-center gap-3">
          <span className="sidebar-user-avatar">{initials(displayName)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
            <p className="text-[11px] text-muted">Plano ativo</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-shell flex min-h-screen">
      <aside className="admin-sidebar hidden w-[15.5rem] shrink-0 lg:sticky lg:top-0 lg:h-screen lg:flex lg:flex-col">
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            aria-label="Fechar menu"
            onClick={closeMobile}
          />
          <aside className="admin-sidebar relative z-50 h-full w-[15.5rem] shadow-2xl">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="admin-header admin-topbar sticky top-0 z-30 flex items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="rounded-lg border border-border bg-white p-2 text-muted transition hover:bg-muted-bg hover:text-foreground lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <NavIconMenu />
            </button>
            <h1 className="truncate text-sm font-semibold tracking-tight md:text-base">
              {pageTitle(pathname)}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden max-w-[12rem] truncate text-xs text-muted sm:inline">
              {displayName}
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
