import { prisma } from "@/lib/prisma";
import {
  PLATFORM_PLAN_FALLBACKS,
  PLATFORM_PLAN_SLUGS,
} from "@/lib/billing/plans-catalog";

/** Garante os planos do checkout no banco (idempotente). */
export async function ensurePlatformCheckoutPlans() {
  await prisma.plan.updateMany({
    where: { slug: "essencial" },
    data: { isActive: false },
  });

  for (const plan of PLATFORM_PLAN_FALLBACKS) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: {
        name: plan.name,
        priceCents: plan.priceCents,
        interval: plan.interval,
        trialDays: 0,
        isActive: true,
        whatsappQuotaMonthly: plan.whatsappQuotaMonthly,
      },
      create: {
        name: plan.name,
        slug: plan.slug,
        priceCents: plan.priceCents,
        interval: plan.interval,
        trialDays: 0,
        isActive: true,
        whatsappQuotaMonthly: plan.whatsappQuotaMonthly,
      },
    });
  }

  return prisma.plan.findMany({
    where: {
      isActive: true,
      slug: {
        in: [PLATFORM_PLAN_SLUGS.monthly, PLATFORM_PLAN_SLUGS.semester],
      },
    },
    orderBy: { priceCents: "asc" },
  });
}
