"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { getProductBrand, type ProductBrandId } from "@/lib/product-brand";
import { useHostProductBrand } from "@/hooks/useProductBrand";
import {
  resolveBusinessProfile,
  type BusinessProfileId,
} from "@/lib/business-profile";
import {
  NavIconAccount,
  NavIconBookings,
  NavIconCalendar,
  NavIconCheckout,
  NavIconDocument,
  NavIconFinance,
  NavIconHome,
  NavIconMenu,
  NavIconPages,
  NavIconServices,
  NavIconSettings,
} from "@/components/admin/NavIcons";

const PRO_BLOCKED_PREFIXES = [
  "/app/agendador",
  "/app/pages",
  "/app/servicos",
  "/app/checkout",
  "/app/integracoes",
  "/app/integrations",
  "/app/configuracoes",
  "/app/profissionais",
  "/app/professionals",
  "/app/conta",
  "/app/settings",
  "/app/salao",
  "/app/equipe",
  "/app/declaracoes",
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
    title: "Agenda",
    items: [
      { href: "/app", label: "Painel", icon: NavIconHome, match: (p) => p === "/app" },
      {
        href: "/app/salao",
        label: "Gestão à vista",
        icon: NavIconBookings,
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
        label: "Lista",
        icon: NavIconBookings,
        match: (p) => p.startsWith("/app/agenda/listagem") || p === "/app/bookings",
      },
    ],
  },
  {
    title: "Negócio",
    items: [
      {
        href: "/app/agendador",
        label: "Páginas",
        icon: NavIconPages,
        match: (p) => p.startsWith("/app/agendador") || p.startsWith("/app/pages"),
      },
      {
        href: "/app/servicos",
        label: "Serviços",
        icon: NavIconServices,
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
];

const PAGE_TITLES: { match: (p: string) => boolean; title: string }[] = [
  { match: (p) => p === "/app", title: "Painel" },
  { match: (p) => p.startsWith("/app/salao"), title: "Gestão à vista" },
  { match: (p) => p.startsWith("/app/agenda/calendario"), title: "Calendário" },
  { match: (p) => p.startsWith("/app/agenda/listagem"), title: "Lista" },
  { match: (p) => p.startsWith("/app/bookings"), title: "Lista" },
  { match: (p) => p.startsWith("/app/servicos"), title: "Serviços" },
  { match: (p) => p.startsWith("/app/clientes"), title: "Clientes" },
  {
    match: (p) =>
      p.startsWith("/app/agendador") && p.includes("/availability"),
    title: "Horários avançados",
  },
  { match: (p) => p.startsWith("/app/agendador"), title: "Páginas" },
  { match: (p) => p.startsWith("/app/pages"), title: "Páginas" },
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
  { match: (p) => p.startsWith("/app/declaracoes"), title: "Declarações" },
  {
    match: (p) =>
      p.startsWith("/app/configuracoes") ||
      p.startsWith("/app/integracoes") ||
      p.startsWith("/app/integrations") ||
      p.startsWith("/app/conta") ||
      p.startsWith("/app/settings") ||
      p.startsWith("/app/equipe"),
    title: "Configurações",
  },
];

function pageTitle(
  pathname: string,
  fallback: string,
  clientsLabel = "Clientes",
) {
  if (pathname.startsWith("/app/clientes")) return clientsLabel;
  return PAGE_TITLES.find((t) => t.match(pathname))?.title || fallback;
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
  collapsed = false,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
  collapsed?: boolean;
}) {
  const active = item.match ? item.match(pathname) : pathname === item.href;
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={item.label}
      className={`sidebar-link group ${active ? "sidebar-link-active" : ""}`}
    >
      <span className={`sidebar-icon ${active ? "sidebar-icon-active" : ""}`}>
        <Icon />
      </span>
      {!collapsed && <span className="sidebar-link-label truncate">{item.label}</span>}
      {collapsed && <span className="sr-only">{item.label}</span>}
    </Link>
  );
}

type Props = {
  organizationName?: string | null;
  organizationLogoUrl?: string | null;
  userName?: string | null;
  role?: string | null;
  businessMode?: string | null;
  businessProfile?: BusinessProfileId | string | null;
  featureFlags?: string | null;
  attendanceEnabled?: boolean;
  /** Server-resolved product brand (avoids Host flash / hydration mismatch). */
  productBrandId?: ProductBrandId;
  children: React.ReactNode;
};

function navForRole(
  role: string | null | undefined,
  businessMode: string | null | undefined,
  attendanceEnabled = false,
  clientsLabel = "Clientes",
  clientsCrm = true,
): NavSection[] {
  const isPro = role === "PROFESSIONAL";
  const isMember = role === "MEMBER";
  const salon = businessMode === "SALON";

  if (isMember) {
    // MEMBER não deveria estar no AppShell — layout redireciona para /intake
    return [];
  }

  if (isPro) {
    return [
      {
        title: "Agenda",
        items: [
          {
            href: "/app",
            label: "Painel",
            icon: NavIconHome,
            match: (p) => p === "/app",
          },
          {
            href: "/app/agenda/calendario",
            label: "Calendário",
            icon: NavIconCalendar,
            match: (p) => p.startsWith("/app/agenda/calendario"),
          },
          {
            href: "/app/agenda/listagem",
            label: "Lista",
            icon: NavIconBookings,
            match: (p) =>
              p.startsWith("/app/agenda/listagem") || p === "/app/bookings",
          },
        ],
      },
      {
        title: "Negócio",
        items: [
          ...(clientsCrm
            ? [
                {
                  href: "/app/clientes",
                  label: clientsLabel,
                  icon: NavIconAccount,
                  match: (p: string) => p.startsWith("/app/clientes"),
                } satisfies NavItem,
              ]
            : []),
          {
            href: "/app/financeiro",
            label: "Financeiro",
            icon: NavIconFinance,
            match: (p) => p.startsWith("/app/financeiro"),
          },
        ],
      },
    ];
  }

  const agenda: NavItem[] = [
    {
      href: "/app",
      label: "Painel",
      icon: NavIconHome,
      match: (p) => p === "/app",
    },
  ];
  if (salon) {
    agenda.push({
      href: "/app/salao",
      label: "Gestão à vista",
      icon: NavIconBookings,
      match: (p) => p.startsWith("/app/salao"),
    });
  }
  agenda.push(
    {
      href: "/app/agenda/calendario",
      label: "Calendário",
      icon: NavIconCalendar,
      match: (p) => p.startsWith("/app/agenda/calendario"),
    },
    {
      href: "/app/agenda/listagem",
      label: "Lista",
      icon: NavIconBookings,
      match: (p) =>
        p.startsWith("/app/agenda/listagem") || p === "/app/bookings",
    },
  );

  const negocio: NavItem[] = [
    {
      href: "/app/agendador",
      label: "Páginas",
      icon: NavIconPages,
      match: (p) =>
        p.startsWith("/app/agendador") || p.startsWith("/app/pages"),
    },
    {
      href: "/app/servicos",
      label: "Serviços",
      icon: NavIconServices,
      match: (p) => p.startsWith("/app/servicos"),
    },
  ];
  if (salon) {
    negocio.push({
      href: "/app/profissionais",
      label: "Profissionais",
      icon: NavIconAccount,
      match: (p) =>
        p.startsWith("/app/profissionais") ||
        p.startsWith("/app/professionals"),
    });
  }
  if (clientsCrm) {
    negocio.push({
      href: "/app/clientes",
      label: clientsLabel,
      icon: NavIconAccount,
      match: (p) => p.startsWith("/app/clientes"),
    });
  }
  negocio.push(
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
  if (attendanceEnabled) {
    negocio.push({
      href: "/app/declaracoes",
      label: "Declarações",
      icon: NavIconDocument,
      match: (p) => p.startsWith("/app/declaracoes"),
    });
  }

  return [
    { title: "Agenda", items: agenda },
    { title: "Negócio", items: negocio },
  ];
}

export function AppShell({
  organizationName,
  organizationLogoUrl,
  userName,
  role,
  businessMode,
  businessProfile,
  featureFlags,
  attendanceEnabled = false,
  productBrandId,
  children,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const hostBrand = useHostProductBrand();
  const brand = productBrandId
    ? getProductBrand(productBrandId)
    : hostBrand;
  const profile = resolveBusinessProfile(
    businessProfile,
    featureFlags,
    attendanceEnabled,
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const isBuilder = pathname.includes("/builder");
  const isFloor = pathname.startsWith("/app/salao");
  const isHome = pathname === "/app";
  const displayName = organizationName || userName || "Sua conta";
  const accountName = userName || organizationName || "Sua conta";
  const sections = navForRole(
    role,
    businessMode,
    attendanceEnabled,
    profile.clientNounPlural,
    profile.features.clientsCrm,
  );
  const isTemark = brand.id === "temark";
  const roleLabel =
    role === "PROFESSIONAL"
      ? "Profissional"
      : role === "MEMBER"
        ? "Equipe · Aberturas"
        : businessMode === "SALON"
          ? "Equipe"
          : "Individual";

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("admin_sidebar_collapsed") === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (role === "PROFESSIONAL") {
      if (PRO_BLOCKED_PREFIXES.some((p) => pathname.startsWith(p))) {
        router.replace("/app");
      }
      return;
    }
    if (role === "MEMBER") {
      router.replace("/intake");
    }
  }, [role, pathname, router]);

  const closeMobile = () => setMobileOpen(false);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("admin_sidebar_collapsed", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const settingsHref =
    role === "PROFESSIONAL" ? "/app/perfil" : "/app/configuracoes";
  const settingsActive =
    role === "PROFESSIONAL"
      ? pathname.startsWith("/app/perfil") || pathname.startsWith("/app/profile")
      : pathname.startsWith("/app/configuracoes") ||
        pathname.startsWith("/app/conta") ||
        pathname.startsWith("/app/settings") ||
        pathname.startsWith("/app/equipe") ||
        pathname.startsWith("/app/integracoes") ||
        pathname.startsWith("/app/integrations");

  function renderSidebar(opts: {
    collapsed: boolean;
    showCollapseToggle: boolean;
    onNavigate: () => void;
  }) {
    const { collapsed: isCollapsed, showCollapseToggle, onNavigate } = opts;
    return (
      <div className="flex h-full flex-col">
        {isTemark && brand.wordmarkSrc ? (
          <Link
            href="/app"
            onClick={onNavigate}
            className={`sidebar-brand admin-topbar temark-sidebar-brand ${
              isCollapsed ? "is-collapsed-brand" : ""
            }`}
            aria-label={brand.name}
          >
            <span className="temark-wordmark">
              <Image
                src={brand.wordmarkSrc}
                alt={brand.name}
                width={isCollapsed ? 48 : 140}
                height={isCollapsed ? 28 : 36}
                className="temark-wordmark-img"
                priority
              />
            </span>
          </Link>
        ) : (
          <BrandLogo
            href="/app"
            size="md"
            showText={!isCollapsed}
            title={displayName}
            logoUrl={organizationLogoUrl}
            className={`sidebar-brand admin-topbar ${
              isCollapsed ? "is-collapsed-brand" : ""
            }`}
            onClick={onNavigate}
          />
        )}

        <nav
          className={`flex-1 space-y-5 overflow-y-auto py-2 ${
            isTemark ? "temark-nav" : "px-3"
          }`}
        >
          {sections.map((section) => (
            <div key={section.title}>
              {section.title && !isCollapsed && (
                <p className="sidebar-section-label">{section.title}</p>
              )}
              <div className={isTemark ? "" : "space-y-0.5"}>
                {section.items.map((item) => (
                  <SidebarNavLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    onNavigate={onNavigate}
                    collapsed={isCollapsed}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div
            className={`flex min-w-0 items-center gap-2 ${
              isCollapsed ? "flex-col" : ""
            }`}
          >
            <Link
              href={settingsHref}
              onClick={onNavigate}
              className={`flex min-w-0 flex-1 items-center gap-3 ${
                isCollapsed ? "justify-center" : ""
              }`}
            >
              <span className="sidebar-user-avatar" title={accountName}>
                {initials(accountName)}
              </span>
              {!isCollapsed && (
                <div className="sidebar-user-meta min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {accountName}
                  </p>
                  <p className="text-[11px] text-muted">{roleLabel}</p>
                </div>
              )}
            </Link>
            <Link
              href={settingsHref}
              onClick={onNavigate}
              className={`sidebar-settings-btn ${
                settingsActive ? "is-active" : ""
              }`}
              aria-label="Configurações"
              title="Configurações"
            >
              <NavIconSettings />
            </Link>
          </div>
          {showCollapseToggle && (
            <button
              type="button"
              className="sidebar-collapse-btn"
              onClick={toggleCollapsed}
              aria-label={isCollapsed ? "Expandir menu" : "Minimizar menu"}
              aria-expanded={!isCollapsed}
              title={isCollapsed ? "Expandir" : "Minimizar"}
            >
              <span aria-hidden>{isCollapsed ? "›" : "‹"}</span>
              {!isCollapsed && <span>Minimizar</span>}
            </button>
          )}
          {!isCollapsed && (
            <div className={isTemark ? "mt-2" : "mt-3"}>
              <SignOutButton />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <ConfirmProvider>
    <div
      className={`admin-shell flex min-h-screen ${collapsed ? "sidebar-is-collapsed" : ""}`}
      data-brand={brand.id}
    >
      <aside
        className={`admin-sidebar hidden shrink-0 lg:sticky lg:top-0 lg:h-screen lg:flex lg:flex-col ${
          collapsed ? "is-collapsed" : ""
        }`}
      >
        {renderSidebar({
          collapsed,
          showCollapseToggle: true,
          onNavigate: closeMobile,
        })}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/40"
            onClick={closeMobile}
          />
          <div className="admin-sidebar relative z-10 flex h-full w-[15.5rem] flex-col shadow-xl">
            {renderSidebar({
              collapsed: false,
              showCollapseToggle: false,
              onNavigate: closeMobile,
            })}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {isTemark && !isBuilder && !isFloor && (
          <div className="temark-mobile-bar px-5 lg:hidden">
            <button
              type="button"
              className="btn-secondary !px-2"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <NavIconMenu />
            </button>
            {brand.wordmarkSrc ? (
              <Link href="/app" className="temark-wordmark" aria-label={brand.name}>
                <Image
                  src={brand.wordmarkSrc}
                  alt={brand.name}
                  width={108}
                  height={28}
                  className="temark-wordmark-img"
                />
              </Link>
            ) : (
              <span className="text-sm font-semibold">{brand.name}</span>
            )}
            <Link
              href={settingsHref}
              className="sidebar-user-avatar"
              aria-label="Configurações"
              title="Configurações"
            >
              {initials(accountName)}
            </Link>
          </div>
        )}

        {!isBuilder && !isFloor && !(isTemark && isHome) && (
          <header
            className={
              isTemark
                ? "temark-topbar admin-topbar flex items-end justify-between gap-3 px-5 md:px-8 lg:px-[34px]"
                : "admin-topbar sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-white/90 px-4 backdrop-blur md:px-6 lg:px-8"
            }
          >
            {!isTemark && (
              <button
                type="button"
                className="btn-secondary !px-2 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Abrir menu"
              >
                <NavIconMenu />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <h1
                className={
                  isTemark
                    ? "truncate"
                    : "min-w-0 truncate text-base font-semibold tracking-tight"
                }
              >
                {pageTitle(pathname, brand.name, profile.clientNounPlural)}
              </h1>
            </div>
            {!isTemark && <SignOutButton />}
          </header>
        )}
        <main
          className={
            isBuilder || isFloor
              ? "flex-1"
              : isTemark
                ? `admin-main temark-main flex-1 ${isHome ? "temark-main-home" : ""}`
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
