import { NextResponse } from "next/server";
import { apiRequirePlatformAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await apiRequirePlatformAdmin();
  if ("error" in auth) return auth.error;

  const subs = await prisma.subscription.findMany({
    include: {
      organization: { select: { name: true, slug: true } },
      plan: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });

  return NextResponse.json(subs);
}
