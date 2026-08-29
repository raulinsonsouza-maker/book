import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuthContext, isProfessionalRole } from "@/lib/rbac";

export async function GET() {
  const auth = await apiAuthContext();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  if (!isProfessionalRole(ctx.role) || !ctx.professionalId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pro = await prisma.professional.findFirst({
    where: { id: ctx.professionalId, organizationId: ctx.organizationId },
    include: {
      membership: { include: { user: { select: { email: true } } } },
      availability: { orderBy: { dayOfWeek: "asc" } },
    },
  });
  if (!pro) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: pro.id,
    displayName: pro.displayName,
    photoUrl: pro.photoUrl,
    email: pro.membership.user.email,
    availability: pro.availability.map((r) => ({
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
    })),
  });
}
