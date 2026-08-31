import { NextResponse } from "next/server";
import { apiRequireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import {
  isPlatformBillingEnabled,
  platformMercadoPagoConfigured,
} from "@/lib/billing/platform";

export async function GET() {
  const auth = await apiRequireAdmin();
  if ("error" in auth) return auth.error;

  const sub = await prisma.subscription.findUnique({
    where: { organizationId: auth.ctx.organizationId },
    include: { plan: true },
  });

  return NextResponse.json({
    billingEnabled: isPlatformBillingEnabled(),
    mpConfigured: platformMercadoPagoConfigured(),
    status: sub?.status ?? null,
    trialEndsAt: sub?.trialEndsAt ?? null,
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    plan: sub?.plan ?? null,
  });
}
