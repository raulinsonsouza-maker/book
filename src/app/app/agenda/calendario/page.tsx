import { requireOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { WeekCalendar } from "@/components/agenda/WeekCalendar";

export default async function AgendaCalendarioPage() {
  const { org } = await requireOrg();
  const pages = await prisma.bookingPage.findMany({
    where: { organizationId: org.id, isActive: true },
    include: {
      services: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, take: 1 },
    },
    orderBy: { title: "asc" },
  });

  const withServices = pages.filter((p) => p.services.length > 0);
  if (withServices.length === 0) {
    return (
      <p className="text-sm text-muted">
        Crie uma página com serviço ativo para ver o calendário.
      </p>
    );
  }

  const first = withServices[0];

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Agenda</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Calendário</h1>
        <p className="mt-2 text-sm text-muted">
          Reservas confirmadas, aguardando pagamento, slots livres e ocupação Google.
        </p>
      </div>
      <WeekCalendar
        pages={withServices.map((p) => ({ id: p.id, title: p.title, slug: p.slug }))}
        initialPageId={first.id}
        initialServiceId={first.services[0].id}
      />
    </div>
  );
}
