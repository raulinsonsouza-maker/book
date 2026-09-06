import { NextResponse } from "next/server";
import { z } from "zod";
import { apiRequirePlatformAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { writePlatformAudit } from "@/lib/platform-audit";

const schema = z.object({
  name: z.string().min(2).optional(),
  priceCents: z.number().int().min(0).optional(),
  trialDays: z.number().int().min(0).max(90).optional(),
  isActive: z.boolean().optional(),
  mpPreapprovalPlanId: z.string().nullable().optional(),
  whatsappQuotaMonthly: z.number().int().min(0).max(100_000).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await apiRequirePlatformAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  try {
    const body = schema.parse(await req.json());
    const plan = await prisma.plan.update({ where: { id }, data: body });
    await writePlatformAudit({
      actorUserId: auth.user.id,
      action: "plan.update",
      targetType: "Plan",
      targetId: id,
      meta: body,
    });
    return NextResponse.json(plan);
  } catch {
    return NextResponse.json({ error: "Erro" }, { status: 400 });
  }
}
