import { NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { addSeconds } from "date-fns";
import { prisma } from "@/lib/prisma";
import {
  createPixForProvider,
  createCardForProvider,
  dbProvider,
  assertHoldValid,
  HoldExpiredError,
} from "@/lib/payments/create-payment";
import { confirmCheckoutOrder } from "@/lib/payments/confirm-checkout-order";
import { isDemoPaymentId } from "@/lib/payments/demo";
import { resolvePaymentProvider } from "@/lib/payments/resolve-provider";
import { isValidCpf } from "@/lib/utils";
import {
  PaymentUserError,
  resolveCardPaymentOutcome,
  toPaymentUserMessage,
} from "@/lib/payments/user-messages";
import { resolveCardMaxInstallments } from "@/lib/payments/installments";

async function loadOrder(orderId: string, slug: string) {
  return prisma.checkoutOrder.findFirst({
    where: {
      id: orderId,
      status: "PENDING_PAYMENT",
      checkoutLink: { slug, isActive: true },
    },
    include: {
      product: { include: { organization: true } },
      checkoutLink: true,
      payment: true,
      intakeSubmission: true,
    },
  });
}

function assertIntakePayable(
  order: NonNullable<Awaited<ReturnType<typeof loadOrder>>>,
) {
  if (order.product.productKind !== "INTAKE") return;
  if (
    !order.intakeSubmission ||
    (order.intakeSubmission.status !== "SUBMITTED" &&
      order.intakeSubmission.status !== "DRAFT")
  ) {
    throw new Error("INTAKE_NOT_READY");
  }
  if (order.intakeSubmission.status !== "SUBMITTED") {
    throw new Error("INTAKE_NOT_SUBMITTED");
  }
}

function intakePayBlock(order: NonNullable<Awaited<ReturnType<typeof loadOrder>>>) {
  if (order.product.productKind !== "INTAKE") return null;
  try {
    assertIntakePayable(order);
  } catch {
    return NextResponse.json(
      { error: "Complete o formulário e documentos antes de pagar" },
      { status: 400 },
    );
  }
  return null;
}

const pixSchema = z.object({
  orderId: z.string(),
  fingerprint: z.string().min(1),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const url = new URL(req.url);
  const method = url.searchParams.get("method") || "pix";

  try {
    if (method === "pix") {
      const body = pixSchema.parse(await req.json());
      const order = await loadOrder(body.orderId, slug);
      if (!order) {
        return NextResponse.json(
          { error: "Pedido inválido ou expirado" },
          { status: 404 },
        );
      }
      const intakeBlock = intakePayBlock(order);
      if (intakeBlock) return intakeBlock;

      try {
        assertHoldValid(order);
      } catch {
        await prisma.checkoutOrder.update({
          where: { id: order.id },
          data: { status: "EXPIRED" },
        });
        return NextResponse.json({ error: "Tempo expirado" }, { status: 410 });
      }

      const org = order.product.organization;
      const provider = resolvePaymentProvider(org);
      const idempotencyKey = uuidv4();
      const result = await createPixForProvider({
        provider,
        org,
        customer: order,
        item: {
          title: order.product.title,
          priceCents: order.product.priceCents,
          caktoOfferId: order.product.caktoOfferId,
        },
        idempotencyKey,
        fingerprint: body.fingerprint,
        metadata: { checkoutOrderId: order.id },
      });

      const payment = await prisma.payment.upsert({
        where: { checkoutOrderId: order.id },
        create: {
          checkoutOrderId: order.id,
          method: "PIX",
          status: "PENDING",
          amountCents: order.product.priceCents,
          provider: dbProvider(provider),
          caktoPaymentId: result.id,
          idempotencyKey,
          pixQrCode: result.qrCode,
          pixQrCodeBase64: result.qrCodeBase64 || null,
          pixExpiresAt: addSeconds(new Date(), 3600),
          rawResponse: JSON.stringify(result),
        },
        update: {
          method: "PIX",
          status: "PENDING",
          provider: dbProvider(provider),
          caktoPaymentId: result.id,
          idempotencyKey,
          pixQrCode: result.qrCode,
          pixQrCodeBase64: result.qrCodeBase64 || null,
          pixExpiresAt: addSeconds(new Date(), 3600),
          rawResponse: JSON.stringify(result),
        },
      });

      return NextResponse.json({
        paymentId: payment.id,
        qrCode: result.qrCode,
        qrCodeBase64: result.qrCodeBase64,
        demo: Boolean(result.demo),
        expiresAt: payment.pixExpiresAt,
        provider,
      });
    }

    if (method === "card") {
      const cardSchema = z.object({
        orderId: z.string(),
        fingerprint: z.string().min(1),
        cardToken: z.string().min(1),
        installments: z.number().int().min(1).max(12).optional(),
        customerCpf: z.string().optional(),
      });
      const body = cardSchema.parse(await req.json());
      let order = await loadOrder(body.orderId, slug);
      if (!order) {
        return NextResponse.json(
          { error: "Pedido inválido ou expirado" },
          { status: 404 },
        );
      }
      const intakeBlock = intakePayBlock(order);
      if (intakeBlock) return intakeBlock;

      const cpfDigits = (body.customerCpf || order.customerCpf || "").replace(
        /\D/g,
        "",
      );

      const org = order.product.organization;
      const provider = resolvePaymentProvider(org);
      if (
        provider !== "DEMO" &&
        !body.cardToken.startsWith("demo_") &&
        (!cpfDigits || !isValidCpf(cpfDigits))
      ) {
        return NextResponse.json(
          { error: "CPF obrigatório para cartão" },
          { status: 400 },
        );
      }

      if (cpfDigits && isValidCpf(cpfDigits) && order.customerCpf !== cpfDigits) {
        order = await prisma.checkoutOrder.update({
          where: { id: order.id },
          data: { customerCpf: cpfDigits },
          include: {
            product: { include: { organization: true } },
            checkoutLink: true,
            payment: true,
            intakeSubmission: true,
          },
        });
      }

      const idempotencyKey = uuidv4();
      const remoteIp =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        undefined;
      const result = await createCardForProvider({
        provider,
        org: order.product.organization,
        customer: { ...order, customerCpf: cpfDigits || order.customerCpf },
        item: {
          title: order.product.title,
          priceCents: order.product.priceCents,
          caktoOfferId: order.product.caktoOfferId,
        },
        idempotencyKey,
        fingerprint: body.fingerprint,
        cardToken: body.cardToken,
        installments: Math.min(
          body.installments || 1,
          resolveCardMaxInstallments(
            order.product.cardMaxInstallments,
            org.cardMaxInstallments,
          ),
        ),
        metadata: { checkoutOrderId: order.id },
        remoteIp,
      });

      const outcome = resolveCardPaymentOutcome(provider, {
        status: result.status,
        statusDetail:
          "statusDetail" in result
            ? (result as { statusDetail?: string }).statusDetail
            : undefined,
        refuseReason:
          "refuseReason" in result
            ? (result as { refuseReason?: string }).refuseReason
            : undefined,
        demo: result.demo,
      });
      const paid = outcome.kind === "paid";
      const rejected = outcome.kind === "rejected";

      if (paid) {
        await confirmCheckoutOrder(order.id);
      }

      await prisma.payment.upsert({
        where: { checkoutOrderId: order.id },
        create: {
          checkoutOrderId: order.id,
          method: "CARD",
          status: paid ? "PAID" : rejected ? "FAILED" : "PENDING",
          amountCents: order.product.priceCents,
          provider: dbProvider(provider),
          caktoPaymentId: result.id,
          idempotencyKey,
          paidAt: paid ? new Date() : null,
          rawResponse: JSON.stringify(result),
        },
        update: {
          method: "CARD",
          status: paid ? "PAID" : rejected ? "FAILED" : "PENDING",
          provider: dbProvider(provider),
          caktoPaymentId: result.id,
          idempotencyKey,
          paidAt: paid ? new Date() : null,
          rawResponse: JSON.stringify(result),
        },
      });

      if (paid) {
        return NextResponse.json({ ok: true, status: "PAID", demo: result.demo, provider });
      }

      if (rejected) {
        return NextResponse.json(
          { error: outcome.message, status: "REJECTED" },
          { status: 400 },
        );
      }

      return NextResponse.json({
        ok: true,
        status: "PENDING",
        message: outcome.message,
        provider,
      });
    }

    if (method === "abandon") {
      const body = z.object({ orderId: z.string() }).parse(await req.json());
      const order = await loadOrder(body.orderId, slug);
      if (!order) {
        return NextResponse.json({ ok: true, status: "RELEASED" });
      }
      await prisma.checkoutOrder.update({
        where: { id: order.id },
        data: { status: "EXPIRED", holdExpiresAt: null },
      });
      return NextResponse.json({ ok: true, status: "RELEASED" });
    }

    if (method === "demo-confirm") {
      const body = z.object({ orderId: z.string() }).parse(await req.json());
      const order = await loadOrder(body.orderId, slug);
      if (!order) {
        return NextResponse.json({ error: "Pedido inválido" }, { status: 404 });
      }
      const intakeBlock = intakePayBlock(order);
      if (intakeBlock) return intakeBlock;
      if (!isDemoPaymentId(order.payment?.caktoPaymentId)) {
        return NextResponse.json({ error: "Só para demo" }, { status: 400 });
      }
      await confirmCheckoutOrder(order.id);
      return NextResponse.json({ ok: true, status: "PAID" });
    }

    return NextResponse.json({ error: "Método inválido" }, { status: 400 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    if (e instanceof HoldExpiredError) {
      return NextResponse.json(
        {
          error:
            "O tempo para pagar acabou. Atualize a página e tente novamente.",
        },
        { status: 410 },
      );
    }
    if (e instanceof PaymentUserError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json(
      { error: toPaymentUserMessage(e) },
      { status: 400 },
    );
  }
}
