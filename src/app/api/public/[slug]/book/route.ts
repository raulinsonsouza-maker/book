import { NextResponse } from "next/server";
import { z } from "zod";
import { addMinutes } from "date-fns";
import { prisma } from "@/lib/prisma";
import { isSlotAvailable } from "@/lib/availability";
import { parseBookBody } from "@/lib/book-validation";
import { mergeFunnelConfig, parseFunnelConfig } from "@/lib/funnel-config";

const HOLD_MINUTES = 15;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    const raw = await req.json();
    const serviceId = raw.serviceId as string;

    const page = await prisma.bookingPage.findFirst({
      where: { slug, isActive: true },
      include: {
        services: { where: { id: serviceId, isActive: true } },
      },
    });
    if (!page || !page.services[0]) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }

    const funnelConfig = mergeFunnelConfig(parseFunnelConfig(page.funnelConfig), {
      title: page.title,
      description: page.description,
      accentColor: page.accentColor,
      logoUrl: page.logoUrl,
    });
    const body = parseBookBody(funnelConfig, raw);
    const service = page.services[0];
    const startAt = new Date(body.startAt);
    const endAt = addMinutes(startAt, service.durationMinutes);
    const holdExpiresAt = addMinutes(new Date(), HOLD_MINUTES);
    const now = new Date();

    // Anti double-booking
    const conflict = await prisma.booking.findFirst({
      where: {
        bookingPageId: page.id,
        startAt,
        OR: [
          { status: "CONFIRMED" },
          { status: "PENDING_PAYMENT", holdExpiresAt: { gt: now } },
        ],
      },
    });
    if (conflict) {
      return NextResponse.json(
        { error: "Horário indisponível. Escolha outro." },
        { status: 409 },
      );
    }

    const holdConflict = await prisma.slotHold.findFirst({
      where: {
        bookingPageId: page.id,
        startAt,
        expiresAt: { gt: now },
      },
    });
    if (holdConflict) {
      return NextResponse.json(
        { error: "Horário temporariamente reservado. Tente outro." },
        { status: 409 },
      );
    }

    const slotOk = await isSlotAvailable({
      bookingPageId: page.id,
      serviceId: service.id,
      startAt,
      endAt,
      timezone: body.timezone || page.timezone,
      durationMinutes: service.durationMinutes,
      bufferBefore: service.bufferBefore,
      bufferAfter: service.bufferAfter,
    });
    if (!slotOk) {
      return NextResponse.json(
        { error: "Horário indisponível (conflito com agenda). Escolha outro." },
        { status: 409 },
      );
    }

    const booking = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.create({
        data: {
          bookingPageId: page.id,
          serviceId: service.id,
          status: "PENDING_PAYMENT",
          startAt,
          endAt,
          timezone: body.timezone || page.timezone,
          customerName: body.customerName,
          customerEmail: body.customerEmail?.toLowerCase() ?? "",
          customerPhone: body.customerPhone?.replace(/\D/g, "") ?? "",
          customerCpf: body.customerCpf?.replace(/\D/g, "") || null,
          customAnswers: body.customAnswers
            ? JSON.stringify(body.customAnswers)
            : null,
          holdExpiresAt,
        },
        include: { service: true, bookingPage: true },
      });
      await tx.slotHold.create({
        data: {
          bookingPageId: page.id,
          serviceId: service.id,
          bookingId: b.id,
          startAt,
          endAt,
          expiresAt: holdExpiresAt,
        },
      });
      return b;
    });

    return NextResponse.json({
      bookingId: booking.id,
      holdExpiresAt,
      amountCents: service.priceCents,
      serviceTitle: service.title,
      caktoOfferId: service.caktoOfferId,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Erro ao reservar" }, { status: 500 });
  }
}
