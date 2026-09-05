import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiRequireAdmin } from "@/lib/rbac";

const schema = z.object({
  serviceIds: z.array(z.string()).min(1),
});

/** Substitui o conjunto de serviços oferecidos nesta página. */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await apiRequireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const page = await prisma.bookingPage.findFirst({
    where: { id, organizationId: auth.ctx.organizationId },
  });
  if (!page) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = schema.parse(await req.json());
    const uniqueIds = [...new Set(body.serviceIds)];

    const valid = await prisma.service.count({
      where: {
        id: { in: uniqueIds },
        organizationId: auth.ctx.organizationId,
      },
    });
    if (valid !== uniqueIds.length) {
      return NextResponse.json(
        { error: "Um ou mais serviços são inválidos" },
        { status: 400 },
      );
    }

    const org = await prisma.organization.findUnique({
      where: { id: auth.ctx.organizationId },
      select: { businessMode: true },
    });

    const assignedProfessionalIds = await prisma.$transaction(async (tx) => {
      await tx.bookingPageService.deleteMany({ where: { bookingPageId: id } });
      await tx.bookingPageService.createMany({
        data: uniqueIds.map((serviceId, i) => ({
          bookingPageId: id,
          serviceId,
          sortOrder: i,
        })),
      });

      // No salão, o link público só oferece serviços que algum profissional atende.
      if (org?.businessMode !== "SALON") return [] as string[];

      const pros = await tx.professional.findMany({
        where: {
          organizationId: auth.ctx.organizationId,
          isActive: true,
        },
        select: {
          id: true,
          services: { select: { serviceId: true } },
        },
      });
      if (!pros.length) return [];

      const toCreate = pros.flatMap((pro) => {
        const existing = new Set(pro.services.map((s) => s.serviceId));
        return uniqueIds
          .filter((serviceId) => !existing.has(serviceId))
          .map((serviceId) => ({
            professionalId: pro.id,
            serviceId,
          }));
      });
      if (toCreate.length) {
        await tx.professionalService.createMany({ data: toCreate });
      }
      return pros.map((p) => p.id);
    });

    const services = await prisma.service.findMany({
      where: {
        id: { in: uniqueIds },
        organizationId: auth.ctx.organizationId,
      },
      include: { customFields: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({
      serviceIds: uniqueIds,
      services,
      assignedProfessionalIds,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Selecione ao menos um serviço" }, { status: 400 });
    }
    console.error("[pages services PUT]", e);
    return NextResponse.json({ error: "Erro ao salvar" }, { status: 500 });
  }
}
