import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignOutButton } from "@/components/admin/SignOutButton";

const nav = [
  { href: "/app", label: "Início" },
  { href: "/app/pages", label: "Páginas" },
  { href: "/app/bookings", label: "Agendamentos" },
  { href: "/app/settings", label: "Configurações" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (!session.user.organizationId) redirect("/signup/complete");

  return (
    <div className="dot-grid-soft min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-8">
            <Link
              href="/app"
              className="flex items-center gap-2 text-sm font-semibold tracking-tight"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-[10px] font-bold text-white">
                B
              </span>
              Book Symbius
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-muted transition hover:bg-muted-bg hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden rounded-md bg-muted-bg px-2 py-1 text-xs font-medium text-muted sm:inline">
              {session.user.organizationName || session.user.name}
            </span>
            <SignOutButton />
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-border px-4 py-2 md:hidden">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-muted hover:bg-muted-bg hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
