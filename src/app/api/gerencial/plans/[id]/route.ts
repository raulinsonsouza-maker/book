import { NextResponse } from "next/server";
import { z } from "zod";
import { apiRequirePlatformAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  isActive: z.boolean().optional(),
  mpPreapprovalPlanId: z.string().nullable().optional(),
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
    return NextResponse.json(plan);
  } catch {
    return NextResponse.json({ error: "Erro" }, { status: 400 });
  }
}
