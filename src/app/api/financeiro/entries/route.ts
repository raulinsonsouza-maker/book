import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiAuthContext, isAdminRole, isProfessionalRole } from "@/lib/rbac";
import { customerScopeWhere } from "@/lib/clients";

const createSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  amountCents: z.number().int().positive().max(99_999_999),
  method: z.enum(["PIX", "CARD", "CASH", "OTHER"]).default("OTHER"),
  occurredAt: z.string().datetime().or(z.string().min(8)),
  description: z.string().trim().min(1).max(500),
  customerId: z.string().optional().nullable(),
  bookingId: z.string().optional().nullable(),
});

function parseOccurredAt(raw: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T12:00:00`);
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new Error("Data inválida");
  return d;
}

export async function GET(req: Request) {
  const auth = await apiAuthContext();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  if (isProfessionalRole(ctx.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const customerId = searchParams.get("customerId");

  const where: Record<string, unknown> = {
    organizationId: ctx.organizationId,
  };
  if (customerId) where.customerId = customerId;
  if (from || to) {
    where.occurredAt = {
      ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
    };
  }

  const entries = await prisma.cashEntry.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true } },
    },
    orderBy: { occurredAt: "desc" },
    take: 200,
  });

  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      type: e.type,
      amountCents: e.amountCents,
      method: e.method,
      occurredAt: e.occurredAt.toISOString(),
      description: e.description,
      customerId: e.customerId,
      customerName: e.customer?.name ?? null,
      bookingId: e.bookingId,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const auth = await apiAuthContext();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  if (isProfessionalRole(ctx.role) && !isAdminRole(ctx.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  try {
    const body = createSchema.parse(await req.json());
    let customerId: string | null = body.customerId || null;

    if (customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, ...customerScopeWhere(ctx) },
      });
      if (!customer) {
        return NextResponse.json({ error: "Cliente inválido" }, { status: 400 });
      }
    }

    if (body.bookingId) {
      const booking = await prisma.booking.findFirst({
        where: {
          id: body.bookingId,
          bookingPage: { organizationId: ctx.organizationId },
        },
        include: { payment: true },
      });
      if (!booking) {
        return NextResponse.json(
          { error: "Agendamento inválido" },
          { status: 400 },
        );
      }
      if (booking.payment?.status === "PAID") {
        return NextResponse.json(
          { error: "Este agendamento já tem pagamento confirmado" },
          { status: 400 },
        );
      }
      if (!customerId && booking.customerId) {
        customerId = booking.customerId;
      }
    }

    const entry = await prisma.cashEntry.create({
      data: {
        organizationId: ctx.organizationId,
        type: body.type,
        amountCents: body.amountCents,
        method: body.method,
        occurredAt: parseOccurredAt(body.occurredAt),
        description: body.description.trim(),
        customerId,
        bookingId: body.bookingId || null,
        createdByUserId: ctx.userId,
      },
      include: {
        customer: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      entry: {
        id: entry.id,
        type: entry.type,
        amountCents: entry.amountCents,
        method: entry.method,
        occurredAt: entry.occurredAt.toISOString(),
        description: entry.description,
        customerId: entry.customerId,
        customerName: entry.customer?.name ?? null,
        bookingId: entry.bookingId,
        createdAt: entry.createdAt.toISOString(),
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
