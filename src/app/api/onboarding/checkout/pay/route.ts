import { NextResponse } from "next/server";
import { z } from "zod";
import { apiRequireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { activateOrganizationSubscription } from "@/lib/billing/activate-subscription";
import {
  createPlatformCardPayment,
  createPlatformPixPayment,
  getPlatformPayment,
  platformMpPublicKey,
} from "@/lib/billing/mercadopago-platform";
import {
  isPlatformBillingEnabled,
  platformMercadoPagoConfigured,
} from "@/lib/billing/platform";
import { isValidCpf } from "@/lib/utils";

const paySchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("pix"),
  }),
  z.object({
    method: z.literal("card"),
    cardToken: z.string().min(8),
    cpf: z.string().min(11),
    installments: z.coerce.number().int().min(1).max(12).optional(),
  }),
]);

export async function GET(req: Request) {
  const auth = await apiRequireAdmin();
  if ("error" in auth) return auth.error;

  const orgId = auth.ctx.organizationId;
  const url = new URL(req.url);
  const paymentId = url.searchParams.get("paymentId");

  const sub = await prisma.subscription.findUnique({
    where: { organizationId: orgId },
    include: { plan: true },
  });

  if (sub?.status === "ACTIVE") {
    return NextResponse.json({
      status: "ACTIVE",
      paid: true,
      plan: sub.plan,
      publicKey: await platformMpPublicKey(),
    });
  }

  if (paymentId) {
    try {
      const payment = await getPlatformPayment(paymentId);
      if (
        payment.external_reference === orgId &&
        payment.status === "approved"
      ) {
        await activateOrganizationSubscription(orgId, {
          mpPaymentId: String(payment.id),
          amountCents: Math.round((payment.transaction_amount || 0) * 100),
        });
        return NextResponse.json({
          status: "ACTIVE",
          paid: true,
          paymentStatus: payment.status,
        });
      }
      return NextResponse.json({
        status: sub?.status ?? "PAST_DUE",
        paid: false,
        paymentStatus: payment.status,
      });
    } catch {
      return NextResponse.json({
        status: sub?.status ?? "PAST_DUE",
        paid: false,
      });
    }
  }

  return NextResponse.json({
    status: sub?.status ?? null,
    paid: false,
    plan: sub?.plan
      ? {
          id: sub.plan.id,
          name: sub.plan.name,
          slug: sub.plan.slug,
          priceCents: sub.plan.priceCents,
          interval: sub.plan.interval,
        }
      : null,
    publicKey: await platformMpPublicKey(),
    billingEnabled: await isPlatformBillingEnabled(),
    mpConfigured: await platformMercadoPagoConfigured(),
  });
}

export async function POST(req: Request) {
  const auth = await apiRequireAdmin();
  if ("error" in auth) return auth.error;

  if (
    !(await isPlatformBillingEnabled()) ||
    !(await platformMercadoPagoConfigured())
  ) {
    return NextResponse.json(
      { error: "Billing da plataforma não configurado" },
      { status: 503 },
    );
  }

  try {
    const body = paySchema.parse(await req.json());
    const orgId = auth.ctx.organizationId;

    const sub = await prisma.subscription.findUnique({
      where: { organizationId: orgId },
      include: {
        plan: true,
        organization: { select: { name: true } },
      },
    });

    if (!sub?.plan) {
      return NextResponse.json(
        { error: "Plano não encontrado. Refaça o cadastro." },
        { status: 400 },
      );
    }

    if (sub.status === "ACTIVE") {
      return NextResponse.json({ ok: true, paid: true, status: "ACTIVE" });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.ctx.userId },
      select: { email: true, name: true },
    });
    if (!user?.email) {
      return NextResponse.json({ error: "Usuário inválido" }, { status: 400 });
    }

    const description = `Book Symbius — ${sub.plan.name}`;
    const amountCents = sub.plan.priceCents;
    const idempotencyKey = `plat-${orgId}-${body.method}-${Date.now()}`;

    if (body.method === "pix") {
      const result = await createPlatformPixPayment({
        amountCents,
        description,
        payerEmail: user.email,
        payerName: user.name || sub.organization.name,
        organizationId: orgId,
        idempotencyKey,
      });

      await prisma.platformPayment.create({
        data: {
          organizationId: orgId,
          amountCents,
          status: result.status,
          mpPaymentId: result.id,
          description,
        },
      });

      if (result.status === "approved") {
        await activateOrganizationSubscription(orgId, {
          mpPaymentId: result.id,
          amountCents,
          description,
        });
        return NextResponse.json({
          ok: true,
          paid: true,
          paymentId: result.id,
          status: result.status,
        });
      }

      return NextResponse.json({
        ok: true,
        paid: false,
        paymentId: result.id,
        status: result.status,
        qrCode: result.qrCode,
        qrCodeBase64: result.qrCodeBase64,
      });
    }

    const cpf = body.cpf.replace(/\D/g, "");
    if (!isValidCpf(cpf)) {
      return NextResponse.json({ error: "CPF inválido" }, { status: 400 });
    }

    const maxInstallments =
      sub.plan.interval === "SEMESTER" ? 6 : 1;
    const installments = Math.min(
      maxInstallments,
      body.installments || 1,
    );

    const result = await createPlatformCardPayment({
      amountCents,
      description,
      payerEmail: user.email,
      payerName: user.name || sub.organization.name,
      cpf,
      cardToken: body.cardToken,
      organizationId: orgId,
      idempotencyKey,
      installments,
    });

    await prisma.platformPayment.create({
      data: {
        organizationId: orgId,
        amountCents,
        status: result.status,
        mpPaymentId: result.id,
        description,
      },
    });

    if (result.status === "approved") {
      await activateOrganizationSubscription(orgId, {
        mpPaymentId: result.id,
        amountCents,
        description,
      });
      return NextResponse.json({
        ok: true,
        paid: true,
        paymentId: result.id,
        status: result.status,
      });
    }

    return NextResponse.json({
      ok: true,
      paid: false,
      paymentId: result.id,
      status: result.status,
      awaitingConfirm: ["in_process", "pending"].includes(
        result.status.toLowerCase(),
      ),
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.issues[0]?.message || "Dados inválidos" },
        { status: 400 },
      );
    }
    console.error("[onboarding/checkout/pay]", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Não foi possível processar o pagamento",
      },
      { status: 500 },
    );
  }
}
