"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
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

const PRO_BLOCKED_PREFIXES = [
  "/app/agendador",
  "/app/pages",
  "/app/servicos",
  "/app/checkout",
  "/app/integracoes",
  "/app/integrations",
  "/app/profissionais",
  "/app/professionals",
  "/app/conta",
  "/app/settings",
  "/app/salao",
];

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
        href: "/app/salao",
        label: "Gestão à vista",
        icon: NavIconCalendar,
        match: (p) => p.startsWith("/app/salao"),
      },
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
        href: "/app/agendador",
        label: "Agendador",
        icon: NavIconCalendar,
        match: (p) => p.startsWith("/app/agendador") || p.startsWith("/app/pages"),
      },
      {
        href: "/app/servicos",
        label: "Serviços",
        icon: NavIconPages,
        match: (p) => p.startsWith("/app/servicos"),
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
        href: "/app/integracoes",
        label: "Integrações",
        icon: NavIconIntegrations,
        match: (p) =>
          p.startsWith("/app/integracoes") || p.startsWith("/app/integrations"),
      },
      {
        href: "/app/conta",
        label: "Conta",
        icon: NavIconAccount,
        match: (p) => p.startsWith("/app/conta") || p.startsWith("/app/settings"),
      },
    ],
  },
];

const PAGE_TITLES: { match: (p: string) => boolean; title: string }[] = [
  { match: (p) => p === "/app", title: "Painel" },
  { match: (p) => p.startsWith("/app/salao"), title: "Gestão à vista" },
  { match: (p) => p.startsWith("/app/agenda/calendario"), title: "Calendário" },
  { match: (p) => p.startsWith("/app/agenda/listagem"), title: "Agendamentos" },
  { match: (p) => p.startsWith("/app/bookings"), title: "Agendamentos" },
  { match: (p) => p.startsWith("/app/servicos"), title: "Serviços" },
  {
    match: (p) =>
      p.startsWith("/app/agendador") && p.includes("/availability"),
    title: "Horários avançados",
  },
  { match: (p) => p.startsWith("/app/agendador"), title: "Agendador" },
  { match: (p) => p.startsWith("/app/pages"), title: "Agendador" },
  { match: (p) => p.startsWith("/app/checkout/vendas"), title: "Vendas" },
  { match: (p) => p.startsWith("/app/checkout/produtos"), title: "Produtos" },
  { match: (p) => p.startsWith("/app/checkout"), title: "Checkout" },
  {
    match: (p) =>
      p.startsWith("/app/profissionais") || p.startsWith("/app/professionals"),
    title: "Profissionais",
  },
  {
    match: (p) => p.startsWith("/app/perfil") || p.startsWith("/app/profile"),
    title: "Meu perfil",
  },
  { match: (p) => p.startsWith("/app/financeiro"), title: "Financeiro" },
  {
    match: (p) =>
      p.startsWith("/app/integracoes") || p.startsWith("/app/integrations"),
    title: "Integrações",
  },
  {
    match: (p) => p.startsWith("/app/conta") || p.startsWith("/app/settings"),
    title: "Conta",
  },
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
  organizationLogoUrl?: string | null;
  userName?: string | null;
  role?: string | null;
  businessMode?: string | null;
  children: React.ReactNode;
};

function navForRole(
  role: string | null | undefined,
  businessMode: string | null | undefined,
): NavSection[] {
  const isPro = role === "PROFESSIONAL";
  const salon = businessMode === "SALON";

  if (isPro) {
    const principal: NavItem[] = [
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
        match: (p) =>
          p.startsWith("/app/agenda/listagem") || p === "/app/bookings",
      },
      {
        href: "/app/financeiro",
        label: "Financeiro",
        icon: NavIconFinance,
        match: (p) => p.startsWith("/app/financeiro"),
      },
    ];
    return [
      { title: "Principal", items: principal },
      {
        title: "Conta",
        items: [
          {
            href: "/app/perfil",
            label: "Meu perfil",
            icon: NavIconAccount,
            match: (p) =>
              p.startsWith("/app/perfil") || p.startsWith("/app/profile"),
          },
        ],
      },
    ];
  }

  const principal: NavItem[] = [
    { href: "/app", label: "Painel", icon: NavIconHome, match: (p) => p === "/app" },
  ];
  if (salon) {
    principal.push({
      href: "/app/salao",
      label: "Gestão à vista",
      icon: NavIconBookings,
      match: (p) => p.startsWith("/app/salao"),
    });
  }
  principal.push(
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
  );

  const gestao: NavItem[] = [
    {
      href: "/app/agendador",
      label: "Agendador",
      icon: NavIconCalendar,
      match: (p) => p.startsWith("/app/agendador") || p.startsWith("/app/pages"),
    },
    {
      href: "/app/servicos",
      label: "Serviços",
      icon: NavIconPages,
      match: (p) => p.startsWith("/app/servicos"),
    },
  ];
  if (salon) {
    gestao.push({
      href: "/app/profissionais",
      label: "Profissionais",
      icon: NavIconBookings,
      match: (p) =>
        p.startsWith("/app/profissionais") || p.startsWith("/app/professionals"),
    });
  }
  gestao.push(
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
  );

  return [
    { title: "Principal", items: principal },
    { title: "Gestão", items: gestao },
    NAV_SECTIONS[2],
  ];
}

export function AppShell({
  organizationName,
  organizationLogoUrl,
  userName,
  role,
  businessMode,
  children,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isBuilder = pathname.includes("/builder");
  const isFloor = pathname.startsWith("/app/salao");
  const displayName = organizationName || userName || "Sua conta";
  const accountName = userName || organizationName || "Sua conta";
  const sections = navForRole(role, businessMode);

  useEffect(() => {
    if (role !== "PROFESSIONAL") return;
    if (PRO_BLOCKED_PREFIXES.some((p) => pathname.startsWith(p))) {
      router.replace("/app");
    }
  }, [role, pathname, router]);

  const closeMobile = () => setMobileOpen(false);

  const sidebar = (
    <div className="flex h-full flex-col">
      <BrandLogo
        href="/app"
        size="sm"
        showText
        title={displayName}
        subtitle="Agendamento"
        logoUrl={organizationLogoUrl}
        className="sidebar-brand admin-topbar"
        onClick={closeMobile}
      />

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {sections.map((section) => (
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
          <span className="sidebar-user-avatar">{initials(accountName)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{accountName}</p>
            <p className="text-[11px] text-muted">
              {role === "PROFESSIONAL"
                ? "Profissional"
                : businessMode === "SALON"
                  ? "Equipe"
                  : "Individual"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ConfirmProvider>
    <div className="admin-shell flex min-h-screen">
      <aside className="admin-sidebar hidden w-[15.5rem] shrink-0 lg:sticky lg:top-0 lg:h-screen lg:flex lg:flex-col">
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/40"
            onClick={closeMobile}
          />
          <div className="relative z-10 flex h-full w-[15.5rem] flex-col bg-white shadow-xl">
            {sidebar}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {!isBuilder && !isFloor && (
          <header className="admin-topbar sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-white/90 px-4 backdrop-blur md:px-6 lg:px-8">
            <button
              type="button"
              className="btn-secondary !px-2 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <NavIconMenu />
            </button>
            <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight">
              {pageTitle(pathname)}
            </h1>
            <SignOutButton />
          </header>
        )}
        <main
          className={
            isBuilder || isFloor
              ? "flex-1"
              : "admin-main flex-1 p-4 md:p-6 lg:p-8"
          }
        >
          {children}
        </main>
      </div>
    </div>
    </ConfirmProvider>
  );
}
