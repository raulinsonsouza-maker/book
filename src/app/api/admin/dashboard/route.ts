import { NextResponse } from "next/server";
import { apiRequirePlatformAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { estimateMrrCents } from "@/lib/billing/platform";
import {
  isPlatformBillingEnabled,
  platformMercadoPagoConfigured,
} from "@/lib/billing/platform-mercadopago-config";
import { pingPlatformMercadoPago } from "@/lib/billing/mercadopago-platform";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  const auth = await apiRequirePlatformAdmin();
  if ("error" in auth) return auth.error;

  const now = new Date();
  const d7 = new Date(now);
  d7.setDate(d7.getDate() - 7);
  const d14 = new Date(now);
  d14.setDate(d14.getDate() - 13);
  d14.setHours(0, 0, 0, 0);
  const d30 = new Date(now);
  d30.setDate(d30.getDate() - 30);
  const trialSoon = new Date(now);
  trialSoon.setDate(trialSoon.getDate() + 7);

  const [
    orgsTotal,
    orgsActive,
    trials,
    usersTotal,
    signups7d,
    signups30d,
    pastDue,
    suspended,
    canceled,
    subsWithPlan,
    bookings30d,
    bookingsConfirmed30d,
    revenuePaid30d,
    revenuePaid7d,
    payments30d,
    recentOrgs,
    attentionPastDue,
    attentionTrialsEnding,
    attentionSuspended,
    orgsCreatedSince14,
    planGroups,
    billingEnabled,
    mpConfigured,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { subscriptionStatus: "ACTIVE" } }),
    prisma.organization.count({ where: { subscriptionStatus: "TRIALING" } }),
    prisma.user.count({ where: { isPlatformAdmin: false } }),
    prisma.organization.count({ where: { createdAt: { gte: d7 } } }),
    prisma.organization.count({ where: { createdAt: { gte: d30 } } }),
    prisma.organization.count({ where: { subscriptionStatus: "PAST_DUE" } }),
    prisma.organization.count({ where: { subscriptionStatus: "SUSPENDED" } }),
    prisma.organization.count({ where: { subscriptionStatus: "CANCELED" } }),
    prisma.subscription.findMany({
      where: { status: "ACTIVE" },
      include: { plan: true },
    }),
    prisma.booking.count({
      where: { createdAt: { gte: d30 }, status: { not: "CANCELLED" } },
    }),
    prisma.booking.count({
      where: { createdAt: { gte: d30 }, status: "CONFIRMED" },
    }),
    prisma.platformPayment.aggregate({
      where: {
        createdAt: { gte: d30 },
        status: { in: ["paid", "approved", "PAID", "APPROVED"] },
      },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.platformPayment.aggregate({
      where: {
        createdAt: { gte: d7 },
        status: { in: ["paid", "approved", "PAID", "APPROVED"] },
      },
      _sum: { amountCents: true },
    }),
    prisma.platformPayment.count({
      where: { createdAt: { gte: d30 } },
    }),
    prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        name: true,
        slug: true,
        subscriptionStatus: true,
        createdAt: true,
        subscription: {
          select: {
            trialEndsAt: true,
            plan: { select: { name: true, slug: true } },
          },
        },
        _count: { select: { memberships: true } },
      },
    }),
    prisma.organization.findMany({
      where: { subscriptionStatus: "PAST_DUE" },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        slug: true,
        subscriptionStatus: true,
        updatedAt: true,
        subscription: {
          select: { plan: { select: { name: true } } },
        },
      },
    }),
    prisma.organization.findMany({
      where: {
        subscriptionStatus: "TRIALING",
        subscription: {
          trialEndsAt: { not: null, lte: trialSoon, gte: now },
        },
      },
      take: 6,
      select: {
        id: true,
        name: true,
        slug: true,
        subscriptionStatus: true,
        subscription: {
          select: {
            trialEndsAt: true,
            plan: { select: { name: true } },
          },
        },
      },
    }),
    prisma.organization.findMany({
      where: { subscriptionStatus: "SUSPENDED" },
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: {
        id: true,
        name: true,
        slug: true,
        subscriptionStatus: true,
        updatedAt: true,
      },
    }),
    prisma.organization.findMany({
      where: { createdAt: { gte: d14 } },
      select: { createdAt: true },
    }),
    prisma.subscription.groupBy({
      by: ["planId"],
      where: { status: "ACTIVE", planId: { not: null } },
      _count: { _all: true },
    }),
    isPlatformBillingEnabled(),
    platformMercadoPagoConfigured(),
  ]);

  const planIds = planGroups
    .map((g) => g.planId)
    .filter((id): id is string => Boolean(id));
  const plans = planIds.length
    ? await prisma.plan.findMany({
        where: { id: { in: planIds } },
        select: {
          id: true,
          name: true,
          slug: true,
          priceCents: true,
          interval: true,
        },
      })
    : [];
  const planById = new Map(plans.map((p) => [p.id, p]));

  const planMix = planGroups
    .map((g) => {
      const plan = g.planId ? planById.get(g.planId) : null;
      if (!plan) return null;
      const count = g._count._all;
      const unitMrr =
        plan.interval === "SEMESTER"
          ? Math.round(plan.priceCents / 6)
          : plan.priceCents;
      return {
        name: plan.name,
        slug: plan.slug,
        interval: plan.interval,
        count,
        mrrCents: unitMrr * count,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b?.mrrCents ?? 0) - (a?.mrrCents ?? 0));

  const signupMap = new Map<string, number>();
  for (let i = 0; i < 14; i++) {
    const d = new Date(d14);
    d.setDate(d14.getDate() + i);
    signupMap.set(dayKey(startOfDay(d)), 0);
  }
  for (const org of orgsCreatedSince14) {
    const key = dayKey(startOfDay(org.createdAt));
    if (signupMap.has(key)) {
      signupMap.set(key, (signupMap.get(key) || 0) + 1);
    }
  }
  const signupsSeries = [...signupMap.entries()].map(([date, count]) => ({
    date,
    count,
  }));

  const mrrCents = estimateMrrCents(subsWithPlan);
  const mpPing = mpConfigured ? await pingPlatformMercadoPago() : null;

  return NextResponse.json({
    generatedAt: now.toISOString(),
    orgsTotal,
    orgsActive,
    trials,
    usersTotal,
    signups7d,
    signups30d,
    pastDue,
    suspended,
    canceled,
    mrrCents,
    arrCents: mrrCents * 12,
    revenue30dCents: revenuePaid30d._sum.amountCents ?? 0,
    revenue7dCents: revenuePaid7d._sum.amountCents ?? 0,
    payments30d,
    paidPayments30d: revenuePaid30d._count,
    bookings30d,
    bookingsConfirmed30d,
    signupsSeries,
    planMix,
    recentOrgs: recentOrgs.map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      subscriptionStatus: o.subscriptionStatus,
      createdAt: o.createdAt.toISOString(),
      planName: o.subscription?.plan?.name ?? null,
      trialEndsAt: o.subscription?.trialEndsAt?.toISOString() ?? null,
      members: o._count.memberships,
    })),
    attention: {
      pastDue: attentionPastDue.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        planName: o.subscription?.plan?.name ?? null,
        updatedAt: o.updatedAt.toISOString(),
      })),
      trialsEnding: attentionTrialsEnding.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        trialEndsAt: o.subscription?.trialEndsAt?.toISOString() ?? null,
      })),
      suspended: attentionSuspended.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        updatedAt: o.updatedAt.toISOString(),
      })),
    },
    health: {
      billingEnabled,
      mpConfigured,
      mpOk: Boolean(mpPing?.ok),
      mpNickname: mpPing && "nickname" in mpPing ? mpPing.nickname ?? null : null,
      mpError: mpPing && !mpPing.ok ? mpPing.error ?? null : null,
    },
  });
}
