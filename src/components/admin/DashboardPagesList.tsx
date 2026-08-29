import Link from "next/link";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { DeletePageButton } from "@/components/admin/DeletePageButton";

type PageItem = {
  id: string;
  title: string;
  slug: string;
  isActive: boolean;
  _count: { services: number; bookings: number };
};

type Props = {
  pages: PageItem[];
  appUrl: string;
};

export function DashboardPagesList({ pages, appUrl }: Props) {
  return (
    <div className="dashboard-panel rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight">
          Minhas agendas
        </h2>
        <Link
          href="/app/pages"
          className="text-xs font-medium text-[#2563eb] hover:underline"
        >
          Ver todas
        </Link>
      </div>

      {pages.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border px-4 py-8 text-center">
          <p className="text-sm text-muted">Nenhuma agenda criada ainda.</p>
          <Link href="/app/pages" className="btn-primary mt-4 inline-block !text-xs">
            Criar primeira agenda
          </Link>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {pages.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${p.isActive ? "bg-emerald-500" : "bg-muted"}`}
                  />
                  <p className="truncate font-medium">{p.title}</p>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {p._count.services} serviços · {p._count.bookings} agendamentos
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <CopyLinkButton url={`${appUrl}/p/${p.slug}`} />
                <Link
                  href={`/app/pages/${p.id}/builder`}
                  className="btn-secondary !py-1.5 !text-xs"
                >
                  Personalizar
                </Link>
                <Link
                  href={`/app/pages/${p.id}`}
                  className="btn-primary !py-1.5 !text-xs"
                >
                  Editar
                </Link>
                <DeletePageButton
                  pageId={p.id}
                  pageTitle={p.title}
                  bookingsCount={p._count.bookings}
                  compact
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
