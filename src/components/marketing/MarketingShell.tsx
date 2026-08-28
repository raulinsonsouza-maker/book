import Link from "next/link";
import type { ReactNode } from "react";

type MarketingShellProps = {
  children: ReactNode;
};

export function MarketingShell({ children }: MarketingShellProps) {
  return (
    <div className="dot-grid min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold tracking-tight"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-[10px] font-bold text-white">
              B
            </span>
            Book Symbius
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-secondary !py-1.5 !text-xs sm:!text-sm">
              Entrar
            </Link>
            <Link href="/signup" className="btn-primary !py-1.5 !text-xs sm:!text-sm">
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 md:py-16">{children}</main>

      <footer className="border-t border-border bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <span className="font-medium text-foreground">Book Symbius</span>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/" className="hover:text-foreground">
              Início
            </Link>
            <Link href="/privacidade" className="hover:text-foreground">
              Privacidade
            </Link>
            <Link href="/termos" className="hover:text-foreground">
              Termos
            </Link>
          </nav>
          <span>Um produto Symbius</span>
        </div>
      </footer>
    </div>
  );
}
