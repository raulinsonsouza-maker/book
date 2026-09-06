import { NextResponse } from "next/server";
import { z } from "zod";
import { apiRequirePlatformAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { writePlatformAudit } from "@/lib/platform-audit";

const schema = z.object({
  disabled: z.boolean().optional(),
  isPlatformAdmin: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await apiRequirePlatformAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  try {
    const body = schema.parse(await req.json());

    if (body.isPlatformAdmin !== undefined) {
      if (body.isPlatformAdmin === false && target.isPlatformAdmin) {
        const admins = await prisma.user.count({
          where: { isPlatformAdmin: true, disabledAt: null },
        });
        if (admins <= 1) {
          return NextResponse.json(
            { error: "Não é possível remover o último admin da plataforma" },
            { status: 400 },
          );
        }
      }
      await prisma.user.update({
        where: { id },
        data: { isPlatformAdmin: body.isPlatformAdmin },
      });
      await writePlatformAudit({
        actorUserId: auth.user.id,
        action: body.isPlatformAdmin
          ? "user.promote_platform_admin"
          : "user.revoke_platform_admin",
        targetType: "User",
        targetId: id,
      });
    }

    if (body.disabled !== undefined) {
      if (target.isPlatformAdmin && body.disabled) {
        return NextResponse.json(
          { error: "Não é possível desativar admin da plataforma" },
          { status: 403 },
        );
      }
      await prisma.user.update({
        where: { id },
        data: { disabledAt: body.disabled ? new Date() : null },
      });
      await writePlatformAudit({
        actorUserId: auth.user.id,
        action: body.disabled ? "user.disable" : "user.enable",
        targetType: "User",
        targetId: id,
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}
