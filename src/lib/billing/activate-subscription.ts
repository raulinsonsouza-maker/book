import { prisma } from "@/lib/prisma";
import { setOrgSubscriptionStatus } from "@/lib/billing/platform";
import { inviteOnboardingProfessionals } from "@/lib/onboarding/invite-professionals";

/** Libera acesso após pagamento aprovado (Pix/cartão transparente). */
export async function activateOrganizationSubscription(
  organizationId: string,
  opts?: {
    mpPaymentId?: string;
    amountCents?: number;
    description?: string;
  },
) {
  const sub = await prisma.subscription.findUnique({
    where: { organizationId },
    include: { plan: true },
  });
  if (!sub) return { ok: false as const, alreadyActive: false };

  const alreadyActive = sub.status === "ACTIVE";

  const periodEnd = new Date();
  if (sub.plan?.interval === "SEMESTER") {
    periodEnd.setMonth(periodEnd.getMonth() + 6);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: "ACTIVE",
      currentPeriodEnd: periodEnd,
      trialEndsAt: null,
    },
  });
  await setOrgSubscriptionStatus(organizationId, "ACTIVE");

  if (opts?.mpPaymentId) {
    const existing = await prisma.platformPayment.findFirst({
      where: { mpPaymentId: opts.mpPaymentId },
    });
    if (!existing) {
      await prisma.platformPayment.create({
        data: {
          organizationId,
          amountCents:
            opts.amountCents ??
            sub.plan?.priceCents ??
            0,
          status: "paid",
          mpPaymentId: opts.mpPaymentId,
          description:
            opts.description ||
            `Pagamento ${sub.plan?.name || "plano"}`,
        },
      });
    }
  }

  if (!alreadyActive) {
    await inviteOnboardingProfessionals(organizationId).catch((err) =>
      console.error("[activate-subscription] invite", err),
    );
  }

  return { ok: true as const, alreadyActive };
}
