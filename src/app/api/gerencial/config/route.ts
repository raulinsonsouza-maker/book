import { NextResponse } from "next/server";
import { z } from "zod";
import { apiRequirePlatformAdmin } from "@/lib/rbac";
import { getPlatformConfig } from "@/lib/billing/platform";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await apiRequirePlatformAdmin();
  if ("error" in auth) return auth.error;
  const cfg = await getPlatformConfig();
  return NextResponse.json(cfg);
}

const schema = z.object({
  defaultTrialDays: z.number().int().min(0).max(90),
  supportEmail: z.string().email().nullable().optional(),
  billingBlockMessage: z.string().nullable().optional(),
});

export async function PATCH(req: Request) {
  const auth = await apiRequirePlatformAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = schema.parse(await req.json());
    const cfg = await prisma.platformConfig.upsert({
      where: { id: "singleton" },
      update: body,
      create: { id: "singleton", ...body },
    });
    return NextResponse.json(cfg);
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}
