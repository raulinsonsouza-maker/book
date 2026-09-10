"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { SignOutButton } from "@/components/admin/SignOutButton";

type Props = {
  organizationName?: string | null;
  organizationLogoUrl?: string | null;
  userName?: string | null;
  /** OWNER/ADMIN veem atalho de volta ao painel operacional */
  showAppLink?: boolean;
  children: React.ReactNode;
};

export function IntakeShell({
  organizationName,
  organizationLogoUrl,
  userName,
  showAppLink = false,
  children,
}: Props) {
  const title = organizationName || "Intake";
  const account = userName || organizationName || "Conta";

  return (
    <div className="admin-shell flex min-h-screen flex-col">
      <header className="admin-topbar flex h-14 items-center justify-between gap-3 border-b border-border px-4 md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <BrandLogo
            href="/intake"
            size="md"
            showText
            title={title}
            logoUrl={organizationLogoUrl}
          />
          <span className="hidden text-xs font-medium uppercase tracking-wide text-muted sm:inline">
            Documentos · Intake
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {showAppLink && (
            <Link
              href="/app"
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted hover:bg-muted-bg hover:text-foreground"
            >
              Painel
            </Link>
          )}
          <span className="hidden max-w-[10rem] truncate text-sm text-muted sm:inline">
            {account}
          </span>
          <SignOutButton />
        </div>
      </header>
      <main className="admin-main relative flex-1">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(16,185,129,0.08), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(14,165,233,0.06), transparent)",
          }}
        />
        <div className="relative mx-auto w-full max-w-5xl p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
