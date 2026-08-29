import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeRules } from "@/lib/availability-core";
import {
  apiAuthContext,
  isAdminRole,
  isProfessionalRole,
} from "@/lib/rbac";

const schema = z.object({
  bookingPageId: z.string().optional(),
  professionalId: z.string().optional(),
  rules: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string(),
      endTime: z.string(),
    }),
  ),
}).refine((d) => Boolean(d.bookingPageId) !== Boolean(d.professionalId) || (d.bookingPageId && !d.professionalId) || (!d.bookingPageId && d.professionalId), {
  message: "Informe bookingPageId ou professionalId",
});

export async function PUT(req: Request) {
  const auth = await apiAuthContext();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  try {
    const body = schema.parse(await req.json());
    const normalized = normalizeRules(body.rules);

    if (body.professionalId) {
      const pro = await prisma.professional.findFirst({
        where: { id: body.professionalId, organizationId: ctx.organizationId },
      });
      if (!pro) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const canEdit =
        isAdminRole(ctx.role) ||
        (isProfessionalRole(ctx.role) && ctx.professionalId === pro.id);
      if (!canEdit) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      await prisma.$transaction([
        prisma.availabilityRule.deleteMany({
          where: { professionalId: body.professionalId },
        }),
        prisma.availabilityRule.createMany({
          data: normalized.map((r) => ({
            professionalId: body.professionalId!,
            dayOfWeek: r.dayOfWeek,
            startTime: r.startTime,
            endTime: r.endTime,
          })),
        }),
      ]);

      const rules = await prisma.availabilityRule.findMany({
        where: { professionalId: body.professionalId },
        orderBy: { dayOfWeek: "asc" },
      });
      return NextResponse.json(rules);
    }

    if (!isAdminRole(ctx.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const page = await prisma.bookingPage.findFirst({
      where: {
        id: body.bookingPageId!,
        organizationId: ctx.organizationId,
      },
    });
    if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.$transaction([
      prisma.availabilityRule.deleteMany({
        where: { bookingPageId: body.bookingPageId!, professionalId: null },
      }),
      prisma.availabilityRule.createMany({
        data: normalized.map((r) => ({
          bookingPageId: body.bookingPageId!,
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime,
          endTime: r.endTime,
        })),
      }),
    ]);

    const rules = await prisma.availabilityRule.findMany({
      where: { bookingPageId: body.bookingPageId!, professionalId: null },
      orderBy: { dayOfWeek: "asc" },
    });
    return NextResponse.json(rules);
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}
