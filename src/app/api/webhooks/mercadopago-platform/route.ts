import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setOrgSubscriptionStatus } from "@/lib/billing/platform";
import { activateOrganizationSubscription } from "@/lib/billing/activate-subscription";
import { inviteOnboardingProfessionals } from "@/lib/onboarding/invite-professionals";

type MpWebhookBody = {
  type?: string;
  action?: string;
  data?: { id?: string };
};

async function activateFromPreapproval(preapprovalId: string) {
  const sub = await prisma.subscription.findFirst({
    where: { mpPreapprovalId: preapprovalId },
  });
  if (!sub) return false;

  const alreadyActive = sub.status === "ACTIVE";

  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: "ACTIVE",
      currentPeriodEnd: periodEnd,
      trialEndsAt: null,
    },
  });
  await setOrgSubscriptionStatus(sub.organizationId, "ACTIVE");

  const plan = sub.planId
    ? await prisma.plan.findUnique({ where: { id: sub.planId } })
    : null;
  if (plan) {
    const existing = await prisma.platformPayment.findFirst({
      where: { mpPaymentId: preapprovalId },
    });
    if (!existing) {
      await prisma.platformPayment.create({
        data: {
          organizationId: sub.organizationId,
          amountCents: plan.priceCents,
          status: "paid",
          mpPaymentId: preapprovalId,
          description: `Assinatura ${plan.name}`,
        },
      });
    }
  }

  if (!alreadyActive) {
    await inviteOnboardingProfessionals(sub.organizationId).catch((err) =>
      console.error("[mp-platform-webhook] invite preapproval", err),
    );
  }

  return true;
}

async function activateFromPayment(paymentId: string) {
  const { getPlatformMpAccessToken } = await import(
    "@/lib/billing/platform-mercadopago-config"
  );
  const token = await getPlatformMpAccessToken();
  if (!token) return false;

  const res = await fetch(
    `https://api.mercadopago.com/v1/payments/${paymentId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return false;
  const payment = (await res.json()) as {
    status?: string;
    external_reference?: string;
    transaction_amount?: number;
  };

  if (payment.status !== "approved") return false;
  const orgId = payment.external_reference;
  if (!orgId) return false;

  const result = await activateOrganizationSubscription(orgId, {
    mpPaymentId: paymentId,
    amountCents: Math.round((payment.transaction_amount || 0) * 100),
  });
  return result.ok;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as MpWebhookBody;
    const id = body.data?.id ? String(body.data.id) : "";
    if (!id) {
      return NextResponse.json({ ok: true });
    }

    const type = (body.type || "").toLowerCase();
    const action = (body.action || "").toLowerCase();

    if (type.includes("payment") || type === "payment") {
      await activateFromPayment(id);
      return NextResponse.json({ ok: true });
    }

    if (
      type.includes("subscription") ||
      type.includes("preapproval") ||
      action.includes("subscription")
    ) {
      const sub = await prisma.subscription.findFirst({
        where: { mpPreapprovalId: id },
      });
      if (!sub) {
        return NextResponse.json({ ok: true });
      }

      if (action.includes("cancel") || action.includes("paused")) {
        await setOrgSubscriptionStatus(sub.organizationId, "CANCELED");
      } else if (action.includes("payment") && action.includes("failed")) {
        await setOrgSubscriptionStatus(sub.organizationId, "PAST_DUE");
      } else if (
        action.includes("authorized") ||
        action.includes("payment") ||
        action.includes("created")
      ) {
        await activateFromPreapproval(id);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[mp-platform-webhook]", e);
    return NextResponse.json({ error: "webhook error" }, { status: 500 });
  }
}
