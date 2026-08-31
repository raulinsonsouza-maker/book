import { prisma } from "@/lib/prisma";
import type { SubscriptionStatus } from "@prisma/client";

export function isPlatformBillingEnabled() {
  return process.env.PLATFORM_BILLING_ENABLED === "true";
}

export function platformMercadoPagoConfigured() {
  return Boolean(
    process.env.PLATFORM_MERCADOPAGO_ACCESS_TOKEN?.trim() &&
      process.env.PLATFORM_MERCADOPAGO_PUBLIC_KEY?.trim(),
  );
}

export async function getPlatformConfig() {
  const row = await prisma.platformConfig.findUnique({
    where: { id: "singleton" },
  });
  return (
    row ?? {
      id: "singleton",
      defaultTrialDays: 14,
      supportEmail: null,
      billingBlockMessage: null,
      updatedAt: new Date(),
    }
  );
}

export async function getDefaultPlan() {
  return prisma.plan.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function createTrialSubscription(organizationId: string) {
  const config = await getPlatformConfig();
  const plan = await getDefaultPlan();
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + config.defaultTrialDays);

  const sub = await prisma.subscription.upsert({
    where: { organizationId },
    update: {},
    create: {
      organizationId,
      planId: plan?.id ?? null,
      status: "TRIALING",
      trialEndsAt,
    },
  });

  await prisma.organization.update({
    where: { id: organizationId },
    data: { subscriptionStatus: "TRIALING" },
  });

  return sub;
}

export async function setOrgSubscriptionStatus(
  organizationId: string,
  status: SubscriptionStatus,
) {
  await prisma.$transaction([
    prisma.organization.update({
      where: { id: organizationId },
      data: { subscriptionStatus: status },
    }),
    prisma.subscription.updateMany({
      where: { organizationId },
      data: { status },
    }),
  ]);
}

export type BillingAccess =
  | { allowed: true }
  | { allowed: false; reason: string; status: SubscriptionStatus };

export async function checkOrgBillingAccess(
  organizationId: string,
): Promise<BillingAccess> {
  if (!isPlatformBillingEnabled()) {
    return { allowed: true };
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { subscription: true },
  });
  if (!org) return { allowed: false, reason: "Empresa não encontrada", status: "SUSPENDED" };

  const status = org.subscriptionStatus;
  const sub = org.subscription;

  if (status === "ACTIVE") return { allowed: true };

  if (status === "TRIALING" && sub?.trialEndsAt) {
    if (sub.trialEndsAt.getTime() > Date.now()) return { allowed: true };
    return {
      allowed: false,
      reason: "Seu período de teste terminou. Assine para continuar.",
      status: "TRIALING",
    };
  }

  if (status === "SUSPENDED") {
    return {
      allowed: false,
      reason: "Conta suspensa. Entre em contato com o suporte.",
      status: "SUSPENDED",
    };
  }

  if (status === "PAST_DUE") {
    return {
      allowed: false,
      reason: "Pagamento em atraso. Regularize sua assinatura.",
      status: "PAST_DUE",
    };
  }

  if (status === "CANCELED") {
    return {
      allowed: false,
      reason: "Assinatura cancelada. Reative para continuar.",
      status: "CANCELED",
    };
  }

  return { allowed: true };
}

export function estimateMrrCents(
  subs: { status: string; plan: { priceCents: number } | null }[],
) {
  return subs
    .filter((s) => s.status === "ACTIVE" && s.plan)
    .reduce((sum, s) => sum + (s.plan?.priceCents ?? 0), 0);
}
