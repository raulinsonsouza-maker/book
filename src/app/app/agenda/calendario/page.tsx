import { requireOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getAuthContext, isProfessionalRole } from "@/lib/rbac";
import { WeekCalendar } from "@/components/agenda/WeekCalendar";

export default async function AgendaCalendarioPage() {
  const { org } = await requireOrg();
  const ctx = await getAuthContext();
  const isPro = Boolean(
    ctx && isProfessionalRole(ctx.role) && ctx.professionalId,
  );
  const professionalId = isPro ? ctx!.professionalId : null;

  const pages = await prisma.bookingPage.findMany({
    where: {
      organizationId: org.id,
      isActive: true,
      ...(isPro
        ? {
            services: {
              some: {
                isActive: true,
                professionals: {
                  some: { professionalId: professionalId! },
                },
              },
            },
          }
        : {}),
    },
    include: {
      services: {
        where: {
          isActive: true,
          ...(isPro
            ? {
                professionals: {
                  some: { professionalId: professionalId! },
                },
              }
            : {}),
        },
        orderBy: { sortOrder: "asc" },
        take: isPro ? undefined : 1,
      },
    },
    orderBy: { title: "asc" },
  });

  const withServices = pages.filter((p) => p.services.length > 0);
  if (withServices.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">
          {isPro
            ? "Ainda não há serviços vinculados à sua agenda. Peça ao administrador para associá-los ao seu perfil."
            : "Ainda não há serviços com horários. Configure para ver a grade e os compromissos."}
        </p>
        {!isPro && (
          <a
            href={
              pages[0]
                ? `/app/agendador?id=${pages[0].id}`
                : "/app/agendador"
            }
            className="btn-primary inline-flex !text-sm"
          >
            {pages[0] ? "Continuar configuração" : "Configurar agendador"}
          </a>
        )}
      </div>
    );
  }

  const first = withServices[0];

  return (
    <WeekCalendar
      pages={withServices.map((p) => ({ id: p.id, title: p.title, slug: p.slug }))}
      initialPageId={first.id}
      initialServiceId={first.services[0].id}
      professionalId={professionalId}
      isProfessionalView={isPro}
      businessMode={org.businessMode === "SALON" ? "SALON" : "SOLO"}
    />
  );
}
