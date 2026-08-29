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
import { confirmBooking, SlotUnavailableError } from "@/lib/payments/confirm-booking";
import { isDemoPaymentId } from "@/lib/payments/demo";
import { resolvePaymentProvider } from "@/lib/payments/resolve-provider";
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
        customer: booking,
        item: booking.service,
        idempotencyKey,
        fingerprint: body.fingerprint,
        metadata: { bookingId: booking.id },
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
      const remoteIp =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        undefined;
      const result = await createCardForProvider({
        provider,
        org,
        customer: booking,
        item: booking.service,
        idempotencyKey,
        fingerprint: body.fingerprint,
        cardToken: body.cardToken,
        metadata: { bookingId: booking.id },
        remoteIp,
      });

      const paid = isPaidResult(provider, result);

      if (paid) {
        try {
          await confirmBooking(booking.id);
        } catch (e) {
          if (e instanceof SlotUnavailableError) {
            return NextResponse.json(
              { error: e.message, code: "SLOT_UNAVAILABLE" },
              { status: 409 },
            );
          }
          throw e;
        }
      }

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
      try {
        await confirmBooking(booking!.id);
      } catch (e) {
        if (e instanceof SlotUnavailableError) {
          return NextResponse.json(
            { error: e.message, code: "SLOT_UNAVAILABLE" },
            { status: 409 },
          );
        }
        throw e;
      }
      await prisma.payment.update({
        where: { bookingId: booking!.id },
        data: { status: "PAID", paidAt: new Date() },
      });
      return NextResponse.json({ ok: true, status: "CONFIRMED" });
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
