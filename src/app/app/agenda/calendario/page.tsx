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
    const draft = pages[0];
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">
          Ainda não há serviços com horários. Configure para ver a grade
          e os compromissos do Google.
        </p>
        <a
          href={draft ? `/app/pages/${draft.id}` : "/app/pages"}
          className="btn-primary inline-flex !text-sm"
        >
          {draft ? "Continuar configuração" : "Configurar serviços"}
        </a>
      </div>
    );
  }

  const first = withServices[0];

  return (
    <WeekCalendar
      pages={withServices.map((p) => ({ id: p.id, title: p.title, slug: p.slug }))}
      initialPageId={first.id}
      initialServiceId={first.services[0].id}
    />
  );
}
