import { NextResponse } from "next/server";
import { apiRequireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import {
  isPlatformBillingEnabled,
  platformMercadoPagoConfigured,
} from "@/lib/billing/platform";
import { createPlatformPreapproval } from "@/lib/billing/mercadopago-platform";

export async function POST() {
  const auth = await apiRequireAdmin();
  if ("error" in auth) return auth.error;

  if (!isPlatformBillingEnabled() || !platformMercadoPagoConfigured()) {
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
      where: { isActive: true },
      orderBy: { priceCents: "asc" },
    }));

  if (!plan) {
    return NextResponse.json({ error: "Nenhum plano ativo" }, { status: 400 });
  }

  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  const mp = await createPlatformPreapproval({
    reason: `Book Symbius — ${plan.name}`,
    payerEmail: auth.ctx.email || "cliente@empresa.com",
    amountCents: plan.priceCents,
    backUrl: `${base}/app/conta?subscription=ok`,
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
