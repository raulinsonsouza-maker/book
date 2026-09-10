import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PLATFORM_PLAN_FALLBACKS } from "@/lib/billing/plans-catalog";
import { ensurePlatformCheckoutPlans } from "@/lib/billing/ensure-plans";

export async function GET() {
  let plans = await prisma.plan.findMany({
    where: {
      isActive: true,
      slug: { in: ["essencial-mensal", "essencial-semestral"] },
    },
    orderBy: { priceCents: "asc" },
    select: {
      slug: true,
      name: true,
      priceCents: true,
      interval: true,
      whatsappQuotaMonthly: true,
    },
  });

  if (!plans.length) {
    const ensured = await ensurePlatformCheckoutPlans();
    plans = ensured.map((p) => ({
      slug: p.slug,
      name: p.name,
      priceCents: p.priceCents,
      interval: p.interval,
      whatsappQuotaMonthly: p.whatsappQuotaMonthly,
    }));
  }

  if (!plans.length) {
    return NextResponse.json({ plans: PLATFORM_PLAN_FALLBACKS });
  }

  const enriched = plans.map((p) => {
    const fallback = PLATFORM_PLAN_FALLBACKS.find((f) => f.slug === p.slug);
    if (fallback) {
      return {
        ...fallback,
        name: p.name,
        priceCents: p.priceCents,
        interval: p.interval,
        whatsappQuotaMonthly: p.whatsappQuotaMonthly,
      };
    }
    return {
      slug: p.slug,
      name: p.name,
      priceCents: p.priceCents,
      interval: p.interval,
      whatsappQuotaMonthly: p.whatsappQuotaMonthly,
      highlight: false,
      badge: null,
      priceLabel: `R$ ${(p.priceCents / 100).toFixed(0)}`,
      detail: `${p.whatsappQuotaMonthly} msgs WhatsApp`,
      compareAtCents: null,
      savingsCents: null,
      installmentHint: null,
    };
  });

  return NextResponse.json({ plans: enriched });
}
