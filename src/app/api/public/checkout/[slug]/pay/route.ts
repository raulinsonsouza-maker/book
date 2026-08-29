import { NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { addSeconds } from "date-fns";
import { prisma } from "@/lib/prisma";
import {
  createPixForProvider,
  createCardForProvider,
  isPaidResult,
  dbProvider,
  assertHoldValid,
  HoldExpiredError,
} from "@/lib/payments/create-payment";
import { confirmCheckoutOrder } from "@/lib/payments/confirm-checkout-order";
import { isDemoPaymentId } from "@/lib/payments/demo";
import { resolvePaymentProvider } from "@/lib/payments/resolve-provider";
import { isValidCpf } from "@/lib/utils";

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
    },
  });
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
      });
      const body = cardSchema.parse(await req.json());
      const order = await loadOrder(body.orderId, slug);
      if (!order) {
        return NextResponse.json(
          { error: "Pedido inválido ou expirado" },
          { status: 404 },
        );
      }

      const org = order.product.organization;
      const provider = resolvePaymentProvider(org);
      const cpf = order.customerCpf;
      if (
        provider !== "DEMO" &&
        !body.cardToken.startsWith("demo_") &&
        (!cpf || !isValidCpf(cpf))
      ) {
        return NextResponse.json(
          { error: "CPF obrigatório para cartão" },
          { status: 400 },
        );
      }

      const idempotencyKey = uuidv4();
      const remoteIp =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        undefined;
      const result = await createCardForProvider({
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
        cardToken: body.cardToken,
        installments: Math.min(
          body.installments || 1,
          Math.min(12, Math.max(1, org.cardMaxInstallments || 12)),
        ),
        metadata: { checkoutOrderId: order.id },
        remoteIp,
      });

      const paid = isPaidResult(provider, result);

      if (paid) {
        await confirmCheckoutOrder(order.id);
      }

      await prisma.payment.upsert({
        where: { checkoutOrderId: order.id },
        create: {
          checkoutOrderId: order.id,
          method: "CARD",
          status: paid ? "PAID" : "PENDING",
          amountCents: order.product.priceCents,
          provider: dbProvider(provider),
          caktoPaymentId: result.id,
          idempotencyKey,
          paidAt: paid ? new Date() : null,
          rawResponse: JSON.stringify(result),
        },
        update: {
          method: "CARD",
          status: paid ? "PAID" : "PENDING",
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

      return NextResponse.json({
        ok: true,
        status: "PENDING",
        message: "Aguardando confirmação do pagamento",
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
      if (!isDemoPaymentId(order?.payment?.caktoPaymentId)) {
        return NextResponse.json({ error: "Só para demo" }, { status: 400 });
      }
      await confirmCheckoutOrder(order!.id);
      return NextResponse.json({ ok: true, status: "PAID" });
    }

    return NextResponse.json({ error: "Método inválido" }, { status: 400 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    if (e instanceof HoldExpiredError) {
      return NextResponse.json({ error: e.message }, { status: 410 });
    }
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro no pagamento" },
      { status: 500 },
    );
  }
}
