import { NextResponse } from "next/server";
import { z } from "zod";
import { addMinutes } from "date-fns";
import { prisma } from "@/lib/prisma";
import {
  assertSlotAvailable,
  pickProfessionalForSlot,
  SlotUnavailableError,
} from "@/lib/availability";
import { parseBookBody } from "@/lib/book-validation";
import { mergeFunnelConfig, parseFunnelConfig } from "@/lib/funnel-config";
import { newManageToken } from "@/lib/booking-notify";

const HOLD_MINUTES = 15;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string; pageSlug: string }> },
) {
  const { slug: orgSlug, pageSlug } = await params;
  try {
    const raw = await req.json();
    const serviceId = raw.serviceId as string;
    let professionalId = (raw.professionalId as string | undefined) || null;
    const anyone = Boolean(raw.anyone);

    const page = await prisma.bookingPage.findFirst({
      where: {
        slug: pageSlug,
        isActive: true,
        organization: { slug: orgSlug },
      },
      include: {
        organization: { select: { businessMode: true } },
        services: {
          where: { id: serviceId, isActive: true },
          include: {
            professionals: {
              where: { professional: { isActive: true } },
              include: { professional: true },
            },
          },
        },
      },
    });
    if (!page || !page.services[0]) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }

    const salonMode = page.organization.businessMode === "SALON";
    const service = page.services[0];
    const linkedPros = service.professionals.map((ps) => ps.professional);

    if (salonMode) {
      if (linkedPros.length === 0) {
        return NextResponse.json(
          { error: "Nenhum profissional disponível para este serviço" },
          { status: 400 },
        );
      }
    }

    const funnelConfig = mergeFunnelConfig(parseFunnelConfig(page.funnelConfig), {
      title: page.title,
      description: page.description,
      accentColor: page.accentColor,
      logoUrl: page.logoUrl,
    });
    const body = parseBookBody(funnelConfig, raw);
    const startAt = new Date(body.startAt);
    const endAt = addMinutes(startAt, service.durationMinutes);
    const holdExpiresAt = addMinutes(new Date(), HOLD_MINUTES);
    const timezone = body.timezone || page.timezone;

    if (salonMode) {
      if (anyone || !professionalId) {
        const picked = await pickProfessionalForSlot({
          bookingPageId: page.id,
          serviceId: service.id,
          startAt,
          endAt,
          timezone,
          durationMinutes: service.durationMinutes,
          bufferBefore: service.bufferBefore,
          bufferAfter: service.bufferAfter,
          professionalIds: linkedPros.map((p) => p.id),
        });
        if (!picked) {
          throw new SlotUnavailableError(
            "Este horário acabou de ser reservado. Escolha outro.",
          );
        }
        professionalId = picked;
      } else if (!linkedPros.some((p) => p.id === professionalId)) {
        return NextResponse.json(
          { error: "Profissional inválido para este serviço" },
          { status: 400 },
        );
      }
    } else {
      professionalId = null;
    }

    const booking = await prisma.$transaction(async (tx) => {
      await assertSlotAvailable({
        bookingPageId: page.id,
        serviceId: service.id,
        startAt,
        endAt,
        timezone,
        durationMinutes: service.durationMinutes,
        bufferBefore: service.bufferBefore,
        bufferAfter: service.bufferAfter,
        professionalId,
      });

      const overlap = await tx.booking.findFirst({
        where: {
          bookingPageId: page.id,
          ...(professionalId ? { professionalId } : {}),
          startAt: { lt: endAt },
          endAt: { gt: startAt },
          OR: [
            { status: "CONFIRMED" },
            { status: "PENDING_PAYMENT", holdExpiresAt: { gt: new Date() } },
          ],
        },
      });
      if (overlap) {
        throw new SlotUnavailableError(
          "Este horário acabou de ser reservado. Escolha outro.",
        );
      }

      const b = await tx.booking.create({
        data: {
          bookingPageId: page.id,
          serviceId: service.id,
          professionalId,
          status: "PENDING_PAYMENT",
          startAt,
          endAt,
          timezone,
          customerName: body.customerName,
          customerEmail: body.customerEmail?.toLowerCase() ?? "",
          customerPhone: body.customerPhone?.replace(/\D/g, "") ?? "",
          customerCpf: body.customerCpf?.replace(/\D/g, "") || null,
          customAnswers: body.customAnswers
            ? JSON.stringify(body.customAnswers)
            : null,
          holdExpiresAt,
          manageToken: newManageToken(),
        },
        include: { service: true, bookingPage: true },
      });

      await tx.slotHold.create({
        data: {
          bookingPageId: page.id,
          serviceId: service.id,
          professionalId,
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
      manageToken: booking.manageToken,
      holdExpiresAt,
      amountCents: service.priceCents,
      serviceTitle: service.title,
      caktoOfferId: service.caktoOfferId,
      professionalId,
    });
  } catch (e) {
    if (e instanceof SlotUnavailableError) {
      return NextResponse.json({ error: e.message, code: "SLOT_UNAVAILABLE" }, { status: 409 });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Erro ao reservar" }, { status: 500 });
  }
}
