"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";

const NAV = [
  { href: "/admin", label: "Painel", match: (p: string) => p === "/admin" },
  {
    href: "/admin/empresas",
    label: "Empresas",
    match: (p: string) => p.startsWith("/admin/empresas"),
  },
  {
    href: "/admin/usuarios",
    label: "Usuários",
    match: (p: string) => p.startsWith("/admin/usuarios"),
  },
  {
    href: "/admin/planos",
    label: "Planos",
    match: (p: string) => p.startsWith("/admin/planos"),
  },
  {
    href: "/admin/assinaturas",
    label: "Assinaturas",
    match: (p: string) => p.startsWith("/admin/assinaturas"),
  },
  {
    href: "/admin/pagamentos",
    label: "Pagamentos",
    match: (p: string) => p.startsWith("/admin/pagamentos"),
  },
  {
    href: "/admin/whatsapp",
    label: "WhatsApp",
    match: (p: string) => p === "/admin/whatsapp" || p.startsWith("/admin/whatsapp/"),
  },
  {
    href: "/admin/mensagens",
    label: "Mensagens",
    match: (p: string) => p.startsWith("/admin/mensagens"),
  },
  {
    href: "/admin/config",
    label: "Config",
    match: (p: string) => p.startsWith("/admin/config"),
  },
];

const TITLES: { match: (p: string) => boolean; title: string }[] = [
  { match: (p) => p === "/admin", title: "Painel admin" },
  { match: (p) => p.startsWith("/admin/empresas"), title: "Empresas" },
  { match: (p) => p.startsWith("/admin/usuarios"), title: "Usuários" },
  { match: (p) => p.startsWith("/admin/planos"), title: "Planos" },
  { match: (p) => p.startsWith("/admin/assinaturas"), title: "Assinaturas" },
  { match: (p) => p.startsWith("/admin/pagamentos"), title: "Pagamentos" },
  { match: (p) => p.startsWith("/admin/whatsapp"), title: "WhatsApp" },
  { match: (p) => p.startsWith("/admin/mensagens"), title: "Mensagens WhatsApp" },
  { match: (p) => p.startsWith("/admin/config"), title: "Configuração" },
];

function titleFor(path: string) {
  return TITLES.find((t) => t.match(path))?.title ?? "Admin";
}

export function AdminShell({
  userName,
  children,
}: {
  userName?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <ConfirmProvider>
      <div className="admin-shell flex min-h-screen">
        <aside className="admin-sidebar hidden w-[15.5rem] shrink-0 border-r border-border bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
          <BrandLogo
            href="/admin"
            size="sm"
            showText
            title="Symbius"
            subtitle="Admin"
            className="sidebar-brand admin-topbar"
          />
          <nav className="flex-1 space-y-0.5 px-3 py-4">
            {NAV.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${active ? "sidebar-link-active" : ""}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="sidebar-footer border-t border-border p-4">
            <p className="truncate text-sm font-medium">{userName || "Admin"}</p>
            <p className="text-[11px] text-muted">Plataforma</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="admin-topbar sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-white/90 px-4 backdrop-blur md:px-8">
            <h1 className="text-base font-semibold tracking-tight">
              {titleFor(pathname)}
            </h1>
            <SignOutButton />
          </header>
          <main className="admin-main flex-1 p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </ConfirmProvider>
  );
}
