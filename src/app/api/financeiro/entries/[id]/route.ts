import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuthContext, isAdminRole, isProfessionalRole } from "@/lib/rbac";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await apiAuthContext();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  if (isProfessionalRole(ctx.role) && !isAdminRole(ctx.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  const entry = await prisma.cashEntry.findFirst({
    where: { id, organizationId: ctx.organizationId },
  });
  if (!entry) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  await prisma.cashEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
