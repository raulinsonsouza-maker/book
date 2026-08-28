import { requireOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AvailabilityEditor } from "@/components/availability/AvailabilityEditor";
import { notFound } from "next/navigation";

export default async function PageAvailabilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { org } = await requireOrg();
  const { id } = await params;

  const page = await prisma.bookingPage.findFirst({
    where: { id, organizationId: org.id },
    include: {
      availability: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
      exceptions: { orderBy: { date: "asc" } },
      services: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  if (!page) notFound();

  if (page.services.length === 0) {
    return (
      <p className="text-sm text-muted">
        Adicione pelo menos um serviço na página antes de configurar horários.
      </p>
    );
  }

  return (
    <AvailabilityEditor
      pageId={page.id}
      pageTitle={page.title}
      timezone={page.timezone}
      initialRules={page.availability}
      initialExceptions={page.exceptions}
      services={page.services}
    />
  );
}
