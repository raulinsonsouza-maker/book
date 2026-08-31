import { requireOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AvailabilityEditor } from "@/components/availability/AvailabilityEditor";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function AgendadorAvailabilityPage({
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
      services: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          title: true,
          durationMinutes: true,
          bufferBefore: true,
          bufferAfter: true,
        },
      },
    },
  });

  if (!page) notFound();

  if (page.services.length === 0) {
    return (
      <p className="text-sm text-muted">
        Adicione pelo menos um serviço em{" "}
        <Link
          href="/app/servicos"
          className="font-medium text-foreground underline-offset-2 hover:underline"
        >
          Serviços
        </Link>{" "}
        antes de configurar horários avançados.
      </p>
    );
  }

  return (
    <AvailabilityEditor
      pageId={page.id}
      pageTitle={page.title}
      timezone={page.timezone}
      slotStepMinutes={page.slotStepMinutes}
      initialRules={page.availability}
      initialExceptions={page.exceptions}
      services={page.services}
    />
  );
}
