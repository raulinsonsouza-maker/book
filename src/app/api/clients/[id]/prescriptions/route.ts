import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiRequireStaff } from "@/lib/rbac";
import { customerScopeWhere } from "@/lib/clients";
import { resolveBusinessProfile } from "@/lib/business-profile";

const itemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  dose: z.string().trim().max(120).optional().nullable(),
  usage: z.string().trim().max(400).optional().nullable(),
});

const schema = z.object({
  items: z.array(itemSchema).min(1).max(30),
  notes: z.string().trim().max(2000).optional().nullable(),
  bookingId: z.string().optional().nullable(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await apiRequireStaff();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;
  const { id } = await params;

  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: {
      businessProfile: true,
      featureFlags: true,
      attendanceEnabled: true,
    },
  });
  const profile = resolveBusinessProfile(
    org?.businessProfile,
    org?.featureFlags,
    org?.attendanceEnabled,
  );
  if (!profile.features.prescriptions) {
    return NextResponse.json(
      { error: "Prescrições não disponíveis neste perfil" },
      { status: 403 },
    );
  }

  const customer = await prisma.customer.findFirst({
    where: { id, ...customerScopeWhere(ctx) },
  });
  if (!customer) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  try {
    const body = schema.parse(await req.json());
    if (body.bookingId) {
      const booking = await prisma.booking.findFirst({
        where: {
          id: body.bookingId,
          customerId: customer.id,
          bookingPage: { organizationId: ctx.organizationId },
        },
      });
      if (!booking) {
        return NextResponse.json(
          { error: "Agendamento inválido" },
          { status: 400 },
        );
      }
    }
    const rx = await prisma.prescription.create({
      data: {
        organizationId: ctx.organizationId,
        customerId: customer.id,
        bookingId: body.bookingId || null,
        authorUserId: ctx.userId,
        items: JSON.stringify(body.items),
        notes: body.notes?.trim() || null,
      },
    });
    return NextResponse.json(rx, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}
