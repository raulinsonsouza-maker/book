import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiRequireAdmin } from "@/lib/rbac";

const createSchema = z.object({
  displayName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  serviceIds: z.array(z.string()).optional(),
  photoUrl: z.string().nullable().optional(),
  copyHoursFromPageId: z.string().optional(),
});

export async function GET() {
  const auth = await apiRequireAdmin();
  if ("error" in auth) return auth.error;

  const pros = await prisma.professional.findMany({
    where: { organizationId: auth.ctx.organizationId },
    include: {
      membership: { include: { user: { select: { email: true, name: true } } } },
      services: { select: { serviceId: true } },
      _count: { select: { bookings: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(
    pros.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      photoUrl: p.photoUrl,
      isActive: p.isActive,
      sortOrder: p.sortOrder,
      email: p.membership.user.email,
      serviceIds: p.services.map((s) => s.serviceId),
      bookingsCount: p._count.bookings,
    })),
  );
}

export async function POST(req: Request) {
  const auth = await apiRequireAdmin();
  if ("error" in auth) return auth.error;

  const org = await prisma.organization.findUnique({
    where: { id: auth.ctx.organizationId },
    select: { businessMode: true },
  });
  if (org?.businessMode !== "SALON") {
    return NextResponse.json(
      { error: "Ative o modo Salão em Conta para cadastrar profissionais." },
      { status: 400 },
    );
  }

  try {
    const body = createSchema.parse(await req.json());
    const email = body.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Já existe uma conta com este e-mail." },
        { status: 409 },
      );
    }

    if (body.serviceIds?.length) {
      const valid = await prisma.service.count({
        where: {
          id: { in: body.serviceIds },
          bookingPage: { organizationId: auth.ctx.organizationId },
        },
      });
      if (valid !== body.serviceIds.length) {
        return NextResponse.json({ error: "Serviço inválido" }, { status: 400 });
      }
    }

    const maxOrder = await prisma.professional.aggregate({
      where: { organizationId: auth.ctx.organizationId },
      _max: { sortOrder: true },
    });

    const passwordHash = await bcrypt.hash(body.password, 10);

    const professional = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name: body.displayName,
          passwordHash,
        },
      });

      const membership = await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: auth.ctx.organizationId,
          role: "PROFESSIONAL",
        },
      });

      const pro = await tx.professional.create({
        data: {
          organizationId: auth.ctx.organizationId,
          membershipId: membership.id,
          displayName: body.displayName,
          photoUrl: body.photoUrl || null,
          sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
          services: body.serviceIds?.length
            ? {
                create: body.serviceIds.map((serviceId) => ({ serviceId })),
              }
            : undefined,
        },
      });

      if (body.copyHoursFromPageId) {
        const page = await tx.bookingPage.findFirst({
          where: {
            id: body.copyHoursFromPageId,
            organizationId: auth.ctx.organizationId,
          },
        });
        if (page) {
          const rules = await tx.availabilityRule.findMany({
            where: { bookingPageId: page.id, professionalId: null },
          });
          if (rules.length) {
            await tx.availabilityRule.createMany({
              data: rules.map((r) => ({
                professionalId: pro.id,
                dayOfWeek: r.dayOfWeek,
                startTime: r.startTime,
                endTime: r.endTime,
              })),
            });
          }
        }
      } else {
        const isFirst = (maxOrder._max.sortOrder ?? 0) === 0;
        if (isFirst) {
          const page = await tx.bookingPage.findFirst({
            where: { organizationId: auth.ctx.organizationId },
            orderBy: { createdAt: "asc" },
          });
          if (page) {
            const rules = await tx.availabilityRule.findMany({
              where: { bookingPageId: page.id, professionalId: null },
            });
            if (rules.length) {
              await tx.availabilityRule.createMany({
                data: rules.map((r) => ({
                  professionalId: pro.id,
                  dayOfWeek: r.dayOfWeek,
                  startTime: r.startTime,
                  endTime: r.endTime,
                })),
              });
            }
          }
        }
      }

      return pro;
    });

    return NextResponse.json({ id: professional.id }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Erro ao criar profissional" }, { status: 500 });
  }
}
