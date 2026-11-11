import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { emitBookingEvent } from "@/lib/events/booking-events";
import {
  apiRequireStaff,
  bookingScopeWhere,
  isProfessionalRole,
} from "@/lib/rbac";
import { ACTIVE_BOOKING_STATUSES } from "@/lib/booking-status";

export async function GET(req: Request) {
  const auth = await apiRequireStaff();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q")?.trim();
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const bookingPageId = searchParams.get("bookingPageId");
  const professionalIdParam = searchParams.get("professionalId");

  const scope = bookingScopeWhere(ctx);

  const bookings = await prisma.booking.findMany({
    where: {
      ...scope,
      ...(bookingPageId && !isProfessionalRole(ctx.role)
        ? { bookingPageId }
        : {}),
      ...(professionalIdParam && !isProfessionalRole(ctx.role)
        ? { professionalId: professionalIdParam }
        : {}),
      ...(status === "ACTIVE"
        ? { status: { in: [...ACTIVE_BOOKING_STATUSES] } }
        : status
          ? {
              status: status as
                | "CONFIRMED"
                | "PENDING_PAYMENT"
                | "ARRIVED"
                | "COMPLETED"
                | "NO_SHOW"
                | "CANCELLED"
                | "EXPIRED",
            }
          : {}),
      ...(from || to
        ? {
            startAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { customerName: { contains: q } },
              { customerEmail: { contains: q } },
            ],
          }
        : {}),
    },
    include: {
      service: true,
      bookingPage: { select: { title: true, slug: true } },
      professional: { select: { id: true, displayName: true } },
      payment: true,
    },
    orderBy: { startAt: "desc" },
    take: 200,
  });
  return NextResponse.json(bookings);
}

const patchSchema = z.object({
  id: z.string(),
  status: z
    .enum([
      "ARRIVED",
      "COMPLETED",
      "NO_SHOW",
      "CANCELLED",
      "CONFIRMED",
    ])
    .optional(),
  cancelSource: z.enum(["PATIENT", "CLINIC"]).optional(),
});

export async function PATCH(req: Request) {
  const auth = await apiRequireStaff();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  try {
    const body = patchSchema.parse(await req.json());
    const booking = await prisma.booking.findFirst({
      where: {
        id: body.id,
        ...bookingScopeWhere(ctx),
      },
      include: {
        bookingPage: true,
      },
    });
    if (!booking) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const nextStatus = body.status ?? "CANCELLED";
    const now = new Date();

    if (nextStatus === "CANCELLED") {
      if (booking.status === "CANCELLED") {
        return NextResponse.json(booking);
      }

      const updated = await prisma.booking.update({
        where: { id: body.id },
        data: {
          status: "CANCELLED",
          cancelledAt: now,
          cancelSource: body.cancelSource ?? "CLINIC",
        },
      });
      await prisma.slotHold.deleteMany({ where: { bookingId: body.id } });

      await emitBookingEvent({
        type: "booking.cancelled",
        organizationId: booking.bookingPage.organizationId,
        bookingId: body.id,
        dedupeKey: `cancel-${body.id}-${now.getTime()}`,
      });

      return NextResponse.json(updated);
    }

    if (booking.status === "CANCELLED" || booking.status === "EXPIRED") {
      return NextResponse.json(
        { error: "Agendamento encerrado não pode mudar de status" },
        { status: 400 },
      );
    }

    if (nextStatus === "ARRIVED") {
      if (!["CONFIRMED", "ARRIVED"].includes(booking.status)) {
        return NextResponse.json(
          { error: "Só é possível marcar chegada em agendamento confirmado" },
          { status: 400 },
        );
      }
      const updated = await prisma.booking.update({
        where: { id: body.id },
        data: {
          status: "ARRIVED",
          arrivedAt: booking.arrivedAt ?? now,
          cancelSource: null,
        },
      });
      return NextResponse.json(updated);
    }

    if (nextStatus === "COMPLETED") {
      if (!["CONFIRMED", "ARRIVED", "COMPLETED"].includes(booking.status)) {
        return NextResponse.json(
          { error: "Só é possível concluir agendamento confirmado" },
          { status: 400 },
        );
      }
      const updated = await prisma.booking.update({
        where: { id: body.id },
        data: {
          status: "COMPLETED",
          arrivedAt: booking.arrivedAt ?? now,
          completedAt: booking.completedAt ?? now,
          cancelSource: null,
        },
      });
      await emitBookingEvent({
        type: "booking.completed",
        organizationId: booking.bookingPage.organizationId,
        bookingId: body.id,
        dedupeKey: `completed-${body.id}`,
      });
      return NextResponse.json(updated);
    }

    if (nextStatus === "NO_SHOW") {
      if (!["CONFIRMED", "ARRIVED"].includes(booking.status)) {
        return NextResponse.json(
          { error: "Só é possível marcar falta em agendamento ativo" },
          { status: 400 },
        );
      }
      const updated = await prisma.booking.update({
        where: { id: body.id },
        data: {
          status: "NO_SHOW",
          cancelSource: null,
        },
      });
      await prisma.slotHold.deleteMany({ where: { bookingId: body.id } });
      return NextResponse.json(updated);
    }

    if (nextStatus === "CONFIRMED") {
      if (!["ARRIVED", "NO_SHOW", "COMPLETED"].includes(booking.status)) {
        return NextResponse.json(
          { error: "Não é possível reverter para confirmado" },
          { status: 400 },
        );
      }
      const updated = await prisma.booking.update({
        where: { id: body.id },
        data: {
          status: "CONFIRMED",
          arrivedAt: null,
          completedAt: null,
          cancelSource: null,
        },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Erro" }, { status: 400 });
  }
}
