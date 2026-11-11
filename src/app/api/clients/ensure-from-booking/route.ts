import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiRequireStaff, bookingScopeWhere } from "@/lib/rbac";
import {
  backfillCustomerBookings,
  ensureCustomerFromBooking,
} from "@/lib/clients";

const schema = z.object({
  bookingId: z.string().min(1),
});

export async function POST(req: Request) {
  const auth = await apiRequireStaff();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  try {
    const body = schema.parse(await req.json());
    const booking = await prisma.booking.findFirst({
      where: {
        id: body.bookingId,
        ...bookingScopeWhere(ctx),
      },
      include: {
        bookingPage: { select: { organizationId: true } },
      },
    });
    if (!booking) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }

    if (booking.customerId) {
      await backfillCustomerBookings({
        organizationId: ctx.organizationId,
        customerId: booking.customerId,
        phoneE164:
          (
            await prisma.customer.findUnique({
              where: { id: booking.customerId },
              select: { phoneE164: true, email: true },
            })
          )?.phoneE164 || booking.customerPhone,
        email: booking.customerEmail,
      });
      return NextResponse.json({ customerId: booking.customerId });
    }

    if (!booking.customerPhone?.trim()) {
      return NextResponse.json(
        { error: "Agendamento sem telefone para vincular prontuário" },
        { status: 400 },
      );
    }

    const customer = await ensureCustomerFromBooking({
      organizationId: booking.bookingPage.organizationId,
      phone: booking.customerPhone,
      name: booking.customerName,
      email: booking.customerEmail || null,
      bookingId: booking.id,
    });
    if (!customer) {
      return NextResponse.json(
        { error: "Telefone inválido" },
        { status: 400 },
      );
    }

    await backfillCustomerBookings({
      organizationId: ctx.organizationId,
      customerId: customer.id,
      phoneE164: customer.phoneE164,
      email: customer.email,
    });

    return NextResponse.json({ customerId: customer.id });
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}
