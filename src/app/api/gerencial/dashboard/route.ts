import { NextResponse } from "next/server";
import { apiRequirePlatformAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { estimateMrrCents } from "@/lib/billing/platform";

export async function GET() {
  const auth = await apiRequirePlatformAdmin();
  if ("error" in auth) return auth.error;

  const now = new Date();
  const d7 = new Date(now);
  d7.setDate(d7.getDate() - 7);
  const d30 = new Date(now);
  d30.setDate(d30.getDate() - 30);

  const [
    orgsTotal,
    orgsActive,
    trials,
    usersTotal,
    signups7d,
    signups30d,
    pastDue,
    suspended,
    subsWithPlan,
    bookings30d,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { subscriptionStatus: "ACTIVE" } }),
    prisma.organization.count({ where: { subscriptionStatus: "TRIALING" } }),
    prisma.user.count({ where: { isPlatformAdmin: false } }),
    prisma.organization.count({ where: { createdAt: { gte: d7 } } }),
    prisma.organization.count({ where: { createdAt: { gte: d30 } } }),
    prisma.organization.count({ where: { subscriptionStatus: "PAST_DUE" } }),
    prisma.organization.count({ where: { subscriptionStatus: "SUSPENDED" } }),
    prisma.subscription.findMany({
      where: { status: "ACTIVE" },
      include: { plan: true },
    }),
    prisma.booking.count({
      where: { createdAt: { gte: d30 }, status: { not: "CANCELLED" } },
    }),
  ]);

  return NextResponse.json({
    orgsTotal,
    orgsActive,
    trials,
    usersTotal,
    signups7d,
    signups30d,
    pastDue,
    suspended,
    mrrCents: estimateMrrCents(subsWithPlan),
    bookings30d,
  });
}
