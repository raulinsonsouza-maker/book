import { NextResponse } from "next/server";
import { apiRequireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import {
  isPlatformBillingEnabled,
  platformMercadoPagoConfigured,
} from "@/lib/billing/platform";
import {
  createPlatformPreapproval,
  createPlatformPreference,
} from "@/lib/billing/mercadopago-platform";
import { getRequestAppOrigin, getRequestProductBrand } from "@/lib/app-origin";

export async function POST() {
  const auth = await apiRequireAdmin();
  if ("error" in auth) return auth.error;

  if (
    !(await isPlatformBillingEnabled()) ||
    !(await platformMercadoPagoConfigured())
  ) {
    return NextResponse.json(
      { error: "Assinatura da plataforma não está disponível" },
      { status: 503 },
    );
  }

  const orgId = auth.ctx.organizationId;
  const sub = await prisma.subscription.findUnique({
    where: { organizationId: orgId },
    include: { plan: true },
  });
  const plan =
    sub?.plan ??
    (await prisma.plan.findFirst({
      where: { isActive: true, slug: "essencial-mensal" },
    })) ??
    (await prisma.plan.findFirst({
      where: { isActive: true },
      orderBy: { priceCents: "asc" },
    }));

  if (!plan) {
    return NextResponse.json({ error: "Nenhum plano ativo" }, { status: 400 });
  }

  const base = await getRequestAppOrigin();
  const brand = await getRequestProductBrand();
  const backUrl = `${base}/onboarding/aguardando`;
  const email = auth.ctx.email || "cliente@empresa.com";

  if (plan.interval === "SEMESTER") {
    const mp = await createPlatformPreference({
      reason: `${brand.name} — ${plan.name}`,
      payerEmail: email,
      amountCents: plan.priceCents,
      backUrl,
      externalReference: orgId,
      maxInstallments: 6,
    });
    await prisma.subscription.upsert({
      where: { organizationId: orgId },
      update: {
        planId: plan.id,
        mpPreferenceId: mp.id,
        status: "PAST_DUE",
      },
      create: {
        organizationId: orgId,
        planId: plan.id,
        mpPreferenceId: mp.id,
        status: "PAST_DUE",
      },
    });
    return NextResponse.json({
      initPoint: mp.init_point || mp.sandbox_init_point,
      preferenceId: mp.id,
    });
  }

  const mp = await createPlatformPreapproval({
    reason: `${brand.name} — ${plan.name}`,
    payerEmail: email,
    amountCents: plan.priceCents,
    backUrl,
    externalReference: orgId,
  });

  await prisma.subscription.upsert({
    where: { organizationId: orgId },
    update: {
      planId: plan.id,
      mpPreapprovalId: mp.id,
      status: "PAST_DUE",
    },
    create: {
      organizationId: orgId,
      planId: plan.id,
      mpPreapprovalId: mp.id,
      status: "PAST_DUE",
    },
  });

  return NextResponse.json({
    initPoint: mp.init_point,
    preapprovalId: mp.id,
  });
}
