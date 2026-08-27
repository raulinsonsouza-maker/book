import Link from "next/link";
import { requireOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";

export default async function AppHomePage() {
  const { org } = await requireOrg();
  const pages = await prisma.bookingPage.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const upcoming = await prisma.booking.findMany({
    where: {
      bookingPage: { organizationId: org.id },
      status: "CONFIRMED",
      startAt: { gte: new Date() },
    },
    include: { service: true, bookingPage: true },
    orderBy: { startAt: "asc" },
    take: 5,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const caktoReady = Boolean(
    org.caktoClientId && org.caktoClientSecret && org.caktoOfferId,
  );

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Painel</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
          Olá, {org.name}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Gerencie páginas de agendamento e cobranças.
        </p>
      </div>

      {!caktoReady && (
        <div className="surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-tight">
              Conecte a Cakto em 1 minuto
            </p>
            <p className="mt-1 text-sm text-muted">
              Cole Client ID, Secret e ID da oferta. Sem isso, o checkout fica
              em modo demo.
            </p>
          </div>
          <Link href="/app/settings" className="btn-primary shrink-0">
            Conectar pagamentos
          </Link>
        </div>
      )}

      {caktoReady && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Cakto conectada — pagamentos ativos
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="surface p-5 md:col-span-1">
          <h2 className="eyebrow">Minha página</h2>
          {pages[0] ? (
            <div className="mt-4 space-y-3">
              <p className="text-lg font-semibold tracking-tight">
                {pages[0].title}
              </p>
              <p className="truncate text-sm text-muted">
                {appUrl}/p/{pages[0].slug}
              </p>
              <div className="flex flex-wrap gap-2">
                <CopyLinkButton url={`${appUrl}/p/${pages[0].slug}`} />
                <Link
                  href={`/app/pages/${pages[0].id}`}
                  className="btn-secondary !py-1.5 !text-xs"
                >
                  Editar
                </Link>
                <Link
                  href={`/p/${pages[0].slug}`}
                  target="_blank"
                  className="btn-primary !py-1.5 !text-xs"
                >
                  Ver página
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-muted">Nenhuma página ainda.</p>
              <Link
                href="/app/pages"
                className="mt-3 inline-block text-sm font-medium text-foreground underline-offset-2 hover:underline"
              >
                Criar página →
              </Link>
            </div>
          )}
        </div>

        <div className="surface p-5 md:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="eyebrow">Próximos agendamentos</h2>
            <Link
              href="/app/bookings"
              className="text-xs font-medium text-muted hover:text-foreground"
            >
              Ver todos
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="mt-6 text-sm text-muted">
              Nenhum agendamento confirmado ainda.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {upcoming.map((b) => {
                const local = toZonedTime(b.startAt, b.timezone);
                return (
                  <li
                    key={b.id}
                    className="flex items-center justify-between py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{b.customerName}</p>
                      <p className="text-muted">{b.service.title}</p>
                    </div>
                    <p className="text-right text-muted">
                      {format(local, "dd MMM · HH:mm", { locale: ptBR })}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
