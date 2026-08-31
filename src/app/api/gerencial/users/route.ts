import { NextResponse } from "next/server";
import { apiRequirePlatformAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await apiRequirePlatformAdmin();
  if ("error" in auth) return auth.error;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      memberships: {
        take: 1,
        orderBy: { createdAt: "asc" },
        include: {
          organization: { select: { name: true, slug: true } },
        },
      },
    },
  });

  return NextResponse.json(users);
}
