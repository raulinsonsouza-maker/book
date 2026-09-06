import { NextResponse } from "next/server";
import { apiRequirePlatformAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const auth = await apiRequirePlatformAdmin();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const status = searchParams.get("status")?.trim() || "";
  const planId = searchParams.get("planId")?.trim() || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const take = Math.min(100, Math.max(10, parseInt(searchParams.get("take") || "40", 10)));
  const skip = (page - 1) * take;

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { slug: { contains: q } },
    ];
  }
  if (status) where.subscriptionStatus = status;
  if (planId) {
    where.subscription = { planId };
  }

  const [total, orgs] = await Promise.all([
    prisma.organization.count({ where }),
    prisma.organization.findMany({
      where,
      include: {
        subscription: { include: { plan: true } },
        _count: {
          select: {
            memberships: true,
            bookingPages: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
  ]);

  return NextResponse.json({ total, page, take, orgs });
}
