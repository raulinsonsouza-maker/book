import { NextResponse } from "next/server";
import { z } from "zod";
import { apiRequirePlatformAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export async function GET() {
  const auth = await apiRequirePlatformAdmin();
  if ("error" in auth) return auth.error;

  const plans = await prisma.plan.findMany({ orderBy: { priceCents: "asc" } });
  return NextResponse.json(plans);
}

const createSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
  priceCents: z.number().int().min(0),
  trialDays: z.number().int().min(0).max(90).optional(),
});

export async function POST(req: Request) {
  const auth = await apiRequirePlatformAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = createSchema.parse(await req.json());
    const slug = body.slug || slugify(body.name);
    const plan = await prisma.plan.create({
      data: {
        name: body.name,
        slug,
        priceCents: body.priceCents,
        trialDays: body.trialDays ?? 14,
      },
    });
    return NextResponse.json(plan);
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}
