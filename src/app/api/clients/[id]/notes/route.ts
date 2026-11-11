import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiRequireStaff } from "@/lib/rbac";
import { customerScopeWhere } from "@/lib/clients";
import { resolveBusinessProfile } from "@/lib/business-profile";

const schema = z.object({
  body: z.string().trim().min(2).max(8000),
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
  if (!profile.features.visitNotes) {
    return NextResponse.json(
      { error: "Notas desativadas neste perfil" },
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
    const note = await prisma.visitNote.create({
      data: {
        organizationId: ctx.organizationId,
        customerId: customer.id,
        bookingId: body.bookingId || null,
        authorUserId: ctx.userId,
        body: body.body,
      },
    });
    return NextResponse.json(note, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}
