import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/customer-auth";
import { emitBookingEvent } from "@/lib/events/booking-events";

async function resolveOrg(slug: string) {
  return prisma.organization.findUnique({ where: { slug } });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const org = await resolveOrg(slug);
  if (!org) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const customer = await getCustomerSession(org.id);
  if (!customer) {
    return NextResponse.json({ error: "Faça login" }, { status: 401 });
  }

  const bookings = await prisma.booking.findMany({
    where: {
      customerId: customer.id,
      bookingPage: { organizationId: org.id },
    },
    include: {
      service: { select: { title: true, durationMinutes: true } },
      professional: { select: { displayName: true } },
      bookingPage: { select: { slug: true, title: true } },
    },
    orderBy: { startAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    bookings: bookings.map((b) => ({
      id: b.id,
      status: b.status,
      startAt: b.startAt,
      endAt: b.endAt,
      timezone: b.timezone,
      serviceTitle: b.service.title,
      professionalName: b.professional?.displayName || null,
      pageSlug: b.bookingPage.slug,
      manageToken: b.manageToken,
      canCancel: b.status === "CONFIRMED" && b.startAt > new Date(),
      canReschedule: b.status === "CONFIRMED" && b.startAt > new Date(),
    })),
  });
}

const patchSchema = z.object({
  bookingId: z.string(),
  action: z.enum(["cancel"]),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const org = await resolveOrg(slug);
  if (!org) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const customer = await getCustomerSession(org.id);
  if (!customer) {
    return NextResponse.json({ error: "Faça login" }, { status: 401 });
  }

  try {
    const body = patchSchema.parse(await req.json());
    const booking = await prisma.booking.findFirst({
      where: {
        id: body.bookingId,
        customerId: customer.id,
        bookingPage: { organizationId: org.id },
      },
    });
    if (!booking) {
      return NextResponse.json({ error: "Reserva não encontrada" }, { status: 404 });
    }
    if (booking.status !== "CONFIRMED") {
      return NextResponse.json(
        { error: "Só é possível cancelar reservas confirmadas" },
        { status: 400 },
      );
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    await emitBookingEvent({
      type: "booking.cancelled",
      organizationId: org.id,
      bookingId: booking.id,
      dedupeKey: `member-cancel-${booking.id}-${Date.now()}`,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}
