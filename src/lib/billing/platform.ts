import { prisma } from "@/lib/prisma";
import type { SubscriptionStatus } from "@prisma/client";
import {
  isPlatformBillingEnabled as isPlatformBillingEnabledFromConfig,
  platformMercadoPagoConfigured as platformMercadoPagoConfiguredFromConfig,
} from "@/lib/billing/platform-mercadopago-config";

export async function isPlatformBillingEnabled() {
  return isPlatformBillingEnabledFromConfig();
}

export async function platformMercadoPagoConfigured() {
  return platformMercadoPagoConfiguredFromConfig();
}

type PlatformConfigSnapshot = {
  id: string;
  defaultTrialDays: number;
  supportEmail: string | null;
  billingBlockMessage: string | null;
  updatedAt: Date;
};

let platformConfigCache: { at: number; value: PlatformConfigSnapshot } | null =
  null;
const PLATFORM_CONFIG_TTL_MS = 60_000;

export async function getPlatformConfig() {
  const now = Date.now();
  if (
    platformConfigCache &&
    now - platformConfigCache.at < PLATFORM_CONFIG_TTL_MS
  ) {
    return platformConfigCache.value;
  }
  const row = await prisma.platformConfig.findUnique({
    where: { id: "singleton" },
  });
  const value: PlatformConfigSnapshot = row ?? {
    id: "singleton",
    defaultTrialDays: 14,
    supportEmail: null,
    billingBlockMessage: null,
    updatedAt: new Date(),
  };
  platformConfigCache = { at: now, value };
  return value;
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

const billingAccessCache = new Map<
  string,
  { at: number; value: BillingAccess }
>();
const BILLING_ACCESS_TTL_MS = 30_000;

export async function checkOrgBillingAccess(
  organizationId: string,
): Promise<BillingAccess> {
  const cached = billingAccessCache.get(organizationId);
  const now = Date.now();
  if (cached && now - cached.at < BILLING_ACCESS_TTL_MS) {
    return cached.value;
  }

  let result: BillingAccess;
  if (!(await isPlatformBillingEnabled())) {
    result = { allowed: true };
  } else {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: { subscription: true },
    });
    if (!org) {
      result = {
        allowed: false,
        reason: "Empresa não encontrada",
        status: "SUSPENDED",
      };
    } else {
      const status = org.subscriptionStatus;
      const sub = org.subscription;

      if (status === "ACTIVE") {
        if (
          sub?.currentPeriodEnd &&
          sub.currentPeriodEnd.getTime() < Date.now()
        ) {
          result = {
            allowed: false,
            reason: "Seu período expirou. Renove a assinatura para continuar.",
            status: "ACTIVE",
          };
        } else {
          result = { allowed: true };
        }
      } else if (status === "TRIALING" && sub?.trialEndsAt) {
        result =
          sub.trialEndsAt.getTime() > Date.now()
            ? { allowed: true }
            : {
                allowed: false,
                reason: "Seu período de teste terminou. Assine para continuar.",
                status: "TRIALING",
              };
      } else if (status === "SUSPENDED") {
        result = {
          allowed: false,
          reason: "Conta suspensa. Entre em contato com o suporte.",
          status: "SUSPENDED",
        };
      } else if (status === "PAST_DUE") {
        result = {
          allowed: false,
          reason: "Pagamento em atraso. Regularize sua assinatura.",
          status: "PAST_DUE",
        };
      } else if (status === "CANCELED") {
        result = {
          allowed: false,
          reason: "Assinatura cancelada. Reative para continuar.",
          status: "CANCELED",
        };
      } else {
        result = { allowed: true };
      }
    }
  }

  billingAccessCache.set(organizationId, { at: now, value: result });
  return result;
}

export function estimateMrrCents(
  subs: {
    status: string;
    plan: { priceCents: number; interval?: string | null } | null;
  }[],
) {
  return subs
    .filter((s) => s.status === "ACTIVE" && s.plan)
    .reduce((sum, s) => {
      const cents = s.plan!.priceCents;
      const monthly =
        s.plan!.interval === "SEMESTER" ? Math.round(cents / 6) : cents;
      return sum + monthly;
    }, 0);
}
