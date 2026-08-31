import { NextResponse } from "next/server";
import { z } from "zod";
import { apiRequirePlatformAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  disabled: z.boolean(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await apiRequirePlatformAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.isPlatformAdmin) {
    return NextResponse.json({ error: "Não permitido" }, { status: 403 });
  }

  try {
    const body = schema.parse(await req.json());
    await prisma.user.update({
      where: { id },
      data: { disabledAt: body.disabled ? new Date() : null },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}
