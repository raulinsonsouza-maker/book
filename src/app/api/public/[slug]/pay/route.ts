import { NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { addSeconds } from "date-fns";
import { prisma } from "@/lib/prisma";
import {
  createPixPayment,
  createDemoPixPayment,
  createCardPayment,
  createDemoCardPayment,
} from "@/lib/cakto/client";
import { sendBookingConfirmation } from "@/lib/email";
import { syncBookingToGoogle } from "@/lib/google/calendar";
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

async function confirmBooking(bookingId: string) {
  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "CONFIRMED",
      confirmedAt: new Date(),
      holdExpiresAt: null,
    },
    include: {
      service: true,
      bookingPage: true,
    },
  });
  await prisma.slotHold.deleteMany({ where: { bookingId } });
  await sendBookingConfirmation({
    to: booking.customerEmail,
    customerName: booking.customerName,
    serviceTitle: booking.service.title,
    pageTitle: booking.bookingPage.title,
    startAt: booking.startAt,
    endAt: booking.endAt,
    timezone: booking.timezone,
    priceCents: booking.service.priceCents,
    bookingId: booking.id,
  });
  // Fire-and-forget sync to Google Calendar
  void syncBookingToGoogle(booking.id);
  return booking;
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
      if (
        booking.holdExpiresAt &&
        booking.holdExpiresAt.getTime() < Date.now()
      ) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { status: "EXPIRED" },
        });
        return NextResponse.json({ error: "Hold expirado" }, { status: 410 });
      }

      const org = booking.bookingPage.organization;
      const idempotencyKey = uuidv4();
      const cpf = booking.customerCpf || "00000000000";
      const customer = {
        name: booking.customerName,
        email: booking.customerEmail,
        phone: booking.customerPhone.startsWith("55")
          ? booking.customerPhone
          : `55${booking.customerPhone}`,
        fingerprint: body.fingerprint,
        docType: "cpf" as const,
        docNumber: cpf,
      };

      let result: {
        id: string;
        status: string;
        qrCode?: string;
        qrCodeBase64?: string;
        demo?: boolean;
      };

      const offerId = booking.service.caktoOfferId || org.caktoOfferId;
      if (org.caktoClientId && org.caktoClientSecret && offerId) {
        result = await createPixPayment({
          creds: {
            clientId: org.caktoClientId,
            clientSecret: org.caktoClientSecret,
          },
          offerId,
          customer,
          idempotencyKey,
          metadata: { bookingId: booking.id },
        });
      } else {
        result = createDemoPixPayment(idempotencyKey);
      }

      const payment = await prisma.payment.upsert({
        where: { bookingId: booking.id },
        create: {
          bookingId: booking.id,
          method: "PIX",
          status: "PENDING",
          amountCents: booking.service.priceCents,
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
      const idempotencyKey = uuidv4();
      const cpf = booking.customerCpf;
      if (!cpf || !isValidCpf(cpf)) {
        return NextResponse.json(
          { error: "CPF obrigatório para cartão" },
          { status: 400 },
        );
      }

      const customer = {
        name: booking.customerName,
        email: booking.customerEmail,
        phone: booking.customerPhone.startsWith("55")
          ? booking.customerPhone
          : `55${booking.customerPhone}`,
        fingerprint: body.fingerprint,
        docType: "cpf" as const,
        docNumber: cpf,
      };

      let result: { id: string; status: string; demo?: boolean };

      const offerId = booking.service.caktoOfferId || org.caktoOfferId;
      if (
        org.caktoClientId &&
        org.caktoClientSecret &&
        offerId &&
        !body.cardToken.startsWith("demo_")
      ) {
        result = await createCardPayment({
          creds: {
            clientId: org.caktoClientId,
            clientSecret: org.caktoClientSecret,
          },
          offerId,
          customer,
          cardToken: body.cardToken,
          idempotencyKey,
          metadata: { bookingId: booking.id },
        });
      } else {
        result = createDemoCardPayment(idempotencyKey);
      }

      const paid =
        result.demo ||
        ["paid", "approved", "captured", "success"].includes(
          String(result.status).toLowerCase(),
        );

      await prisma.payment.upsert({
        where: { bookingId: booking.id },
        create: {
          bookingId: booking.id,
          method: "CARD",
          status: paid ? "PAID" : "PENDING",
          amountCents: booking.service.priceCents,
          caktoPaymentId: result.id,
          idempotencyKey,
          paidAt: paid ? new Date() : null,
          rawResponse: JSON.stringify(result),
        },
        update: {
          method: "CARD",
          status: paid ? "PAID" : "PENDING",
          caktoPaymentId: result.id,
          idempotencyKey,
          paidAt: paid ? new Date() : null,
          rawResponse: JSON.stringify(result),
        },
      });

      if (paid) {
        await confirmBooking(booking.id);
        return NextResponse.json({ ok: true, status: "CONFIRMED", demo: result.demo });
      }

      return NextResponse.json({
        ok: true,
        status: "PENDING",
        message: "Aguardando confirmação do pagamento",
      });
    }

    if (method === "demo-confirm") {
      // Allows confirming demo Pix without real webhook
      const body = z.object({ bookingId: z.string() }).parse(await req.json());
      const booking = await loadBooking(body.bookingId, slug);
      if (!booking?.payment?.caktoPaymentId?.startsWith("demo_")) {
        return NextResponse.json({ error: "Só para demo" }, { status: 400 });
      }
      await prisma.payment.update({
        where: { bookingId: booking.id },
        data: { status: "PAID", paidAt: new Date() },
      });
      await confirmBooking(booking.id);
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
