import { NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { addSeconds } from "date-fns";
import type { Organization, PaymentProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createPixPayment,
  createCardPayment,
} from "@/lib/cakto/client";
import {
  createMercadoPagoPixPayment,
  createMercadoPagoCardPayment,
  isMercadoPagoPaidStatus,
} from "@/lib/mercadopago/client";
import { ensureMercadoPagoAccessToken } from "@/lib/mercadopago/oauth";
import { confirmBooking } from "@/lib/payments/confirm-booking";
import {
  createDemoPixPayment,
  createDemoCardPayment,
  isDemoPaymentId,
} from "@/lib/payments/demo";
import { resolvePaymentProvider, type ResolvedPaymentProvider } from "@/lib/payments/resolve-provider";
import { isValidCpf } from "@/lib/utils";

async function loadBooking(bookingId: string, slug: string) {
  return prisma.booking.findFirst({
    where: {
      id: bookingId,
      bookingPage: { slug, isActive: true },
      status: "PENDING_PAYMENT",
    },
    include: {
      service: true,
      bookingPage: {
        include: { organization: true },
      },
      payment: true,
    },
  });
}

function assertHoldValid(booking: { id: string; holdExpiresAt: Date | null }) {
  if (booking.holdExpiresAt && booking.holdExpiresAt.getTime() < Date.now()) {
    throw new HoldExpiredError();
  }
}

class HoldExpiredError extends Error {
  constructor() {
    super("Hold expirado");
    this.name = "HoldExpiredError";
  }
}

function buildCustomer(booking: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCpf: string | null;
}, fingerprint: string) {
  const cpf = booking.customerCpf || "00000000000";
  return {
    name: booking.customerName,
    email: booking.customerEmail,
    phone: booking.customerPhone.startsWith("55")
      ? booking.customerPhone
      : `55${booking.customerPhone}`,
    fingerprint,
    docType: "cpf" as const,
    docNumber: cpf,
  };
}

function dbProvider(provider: ResolvedPaymentProvider): PaymentProvider {
  return provider === "MERCADO_PAGO" ? "MERCADO_PAGO" : "CAKTO";
}

async function createPixForProvider(params: {
  provider: ResolvedPaymentProvider;
  org: Organization;
  booking: {
    id: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerCpf: string | null;
    service: { title: string; priceCents: number; caktoOfferId: string | null };
  };
  idempotencyKey: string;
  fingerprint: string;
}) {
  const { provider, org, booking, idempotencyKey, fingerprint } = params;

  if (provider === "MERCADO_PAGO" && org.mercadoPagoAccessToken) {
    const accessToken =
      (await ensureMercadoPagoAccessToken(org.id)) || org.mercadoPagoAccessToken;
    const result = await createMercadoPagoPixPayment({
      accessToken,
      amountCents: booking.service.priceCents,
      description: booking.service.title,
      bookingId: booking.id,
      idempotencyKey,
      payer: {
        email: booking.customerEmail,
        name: booking.customerName,
        cpf: booking.customerCpf || undefined,
      },
    });
    return { ...result, demo: false as const };
  }

  const offerId = booking.service.caktoOfferId || org.caktoOfferId;
  if (provider === "CAKTO" && org.caktoClientId && org.caktoClientSecret && offerId) {
    const result = await createPixPayment({
      creds: {
        clientId: org.caktoClientId,
        clientSecret: org.caktoClientSecret,
      },
      offerId,
      customer: buildCustomer(booking, fingerprint),
      idempotencyKey,
      metadata: { bookingId: booking.id },
    });
    return { ...result, demo: false as const };
  }

  return createDemoPixPayment(idempotencyKey);
}

async function createCardForProvider(params: {
  provider: ResolvedPaymentProvider;
  org: Organization;
  booking: {
    id: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerCpf: string | null;
    service: { title: string; priceCents: number; caktoOfferId: string | null };
  };
  idempotencyKey: string;
  fingerprint: string;
  cardToken: string;
}) {
  const { provider, org, booking, idempotencyKey, fingerprint, cardToken } = params;

  if (cardToken.startsWith("demo_")) {
    return createDemoCardPayment(idempotencyKey);
  }

  if (provider === "MERCADO_PAGO" && org.mercadoPagoAccessToken) {
    const accessToken =
      (await ensureMercadoPagoAccessToken(org.id)) || org.mercadoPagoAccessToken;
    const result = await createMercadoPagoCardPayment({
      accessToken,
      amountCents: booking.service.priceCents,
      description: booking.service.title,
      bookingId: booking.id,
      idempotencyKey,
      cardToken,
      payer: {
        email: booking.customerEmail,
        name: booking.customerName,
        cpf: booking.customerCpf || undefined,
      },
    });
    return { ...result, demo: false as const };
  }

  const offerId = booking.service.caktoOfferId || org.caktoOfferId;
  if (provider === "CAKTO" && org.caktoClientId && org.caktoClientSecret && offerId) {
    const result = await createCardPayment({
      creds: {
        clientId: org.caktoClientId,
        clientSecret: org.caktoClientSecret,
      },
      offerId,
      customer: buildCustomer(booking, fingerprint),
      cardToken,
      idempotencyKey,
      metadata: { bookingId: booking.id },
    });
    return { ...result, demo: false as const };
  }

  return createDemoCardPayment(idempotencyKey);
}

function isPaidResult(
  provider: ResolvedPaymentProvider,
  result: { status: string; demo?: boolean },
) {
  if (result.demo) return true;
  if (provider === "MERCADO_PAGO") {
    return isMercadoPagoPaidStatus(result.status);
  }
  return ["paid", "approved", "captured", "success"].includes(
    String(result.status).toLowerCase(),
  );
}

const pixSchema = z.object({
  bookingId: z.string(),
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
      const booking = await loadBooking(body.bookingId, slug);
      if (!booking) {
        return NextResponse.json(
          { error: "Agendamento inválido ou expirado" },
          { status: 404 },
        );
      }

      try {
        assertHoldValid(booking);
      } catch {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { status: "EXPIRED" },
        });
        return NextResponse.json({ error: "Hold expirado" }, { status: 410 });
      }

      const org = booking.bookingPage.organization;
      const provider = resolvePaymentProvider(org);
      const idempotencyKey = uuidv4();
      const result = await createPixForProvider({
        provider,
        org,
        booking,
        idempotencyKey,
        fingerprint: body.fingerprint,
      });

      const payment = await prisma.payment.upsert({
        where: { bookingId: booking.id },
        create: {
          bookingId: booking.id,
          method: "PIX",
          status: "PENDING",
          amountCents: booking.service.priceCents,
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
        bookingId: z.string(),
        fingerprint: z.string().min(1),
        cardToken: z.string().min(1),
      });
      const body = cardSchema.parse(await req.json());
      const booking = await loadBooking(body.bookingId, slug);
      if (!booking) {
        return NextResponse.json(
          { error: "Agendamento inválido ou expirado" },
          { status: 404 },
        );
      }

      const org = booking.bookingPage.organization;
      const provider = resolvePaymentProvider(org);
      const cpf = booking.customerCpf;
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
      const result = await createCardForProvider({
        provider,
        org,
        booking,
        idempotencyKey,
        fingerprint: body.fingerprint,
        cardToken: body.cardToken,
      });

      const paid = isPaidResult(provider, result);

      await prisma.payment.upsert({
        where: { bookingId: booking.id },
        create: {
          bookingId: booking.id,
          method: "CARD",
          status: paid ? "PAID" : "PENDING",
          amountCents: booking.service.priceCents,
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
        await confirmBooking(booking.id);
        return NextResponse.json({ ok: true, status: "CONFIRMED", demo: result.demo, provider });
      }

      return NextResponse.json({
        ok: true,
        status: "PENDING",
        message: "Aguardando confirmação do pagamento",
        provider,
      });
    }

    if (method === "demo-confirm") {
      const body = z.object({ bookingId: z.string() }).parse(await req.json());
      const booking = await loadBooking(body.bookingId, slug);
      if (!isDemoPaymentId(booking?.payment?.caktoPaymentId)) {
        return NextResponse.json({ error: "Só para demo" }, { status: 400 });
      }
      await prisma.payment.update({
        where: { bookingId: booking!.id },
        data: { status: "PAID", paidAt: new Date() },
      });
      await confirmBooking(booking!.id);
      return NextResponse.json({ ok: true, status: "CONFIRMED" });
    }

    return NextResponse.json({ error: "Método inválido" }, { status: 400 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro no pagamento" },
      { status: 500 },
    );
  }
}
