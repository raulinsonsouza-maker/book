import { prisma } from "@/lib/prisma";

export async function getOrgWhatsAppUsage(organizationId: string, when = new Date()) {
  const start = new Date(Date.UTC(when.getUTCFullYear(), when.getUTCMonth(), 1));
  const end = new Date(Date.UTC(when.getUTCFullYear(), when.getUTCMonth() + 1, 1));

  const used = await prisma.whatsAppMessageLog.count({
    where: {
      organizationId,
      billable: true,
      createdAt: { gte: start, lt: end },
      status: { notIn: ["failed", "rejected"] },
    },
  });

  const sub = await prisma.subscription.findUnique({
    where: { organizationId },
    include: { plan: true },
  });

  const quota = sub?.plan?.whatsappQuotaMonthly ?? 200;
  return { used, quota, remaining: Math.max(0, quota - used), periodStart: start };
}

export async function canSendWhatsApp(organizationId: string): Promise<{
  ok: boolean;
  reason?: string;
  used: number;
  quota: number;
}> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { whatsappEnabled: true },
  });
  if (!org?.whatsappEnabled) {
    return { ok: false, reason: "org_disabled", used: 0, quota: 0 };
  }

  const { used, quota } = await getOrgWhatsAppUsage(organizationId);
  if (used >= quota) {
    return { ok: false, reason: "quota_exceeded", used, quota };
  }
  return { ok: true, used, quota };
}
