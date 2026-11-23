import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiRequireStaff } from "@/lib/rbac";
import { toE164 } from "@/lib/whatsapp/phone";
import {
  customerScopeWhere,
  dedupeCustomersByEmailName,
} from "@/lib/clients";
import { resolveBusinessProfile } from "@/lib/business-profile";

export async function GET(req: Request) {
  const auth = await apiRequireStaff();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: {
      businessProfile: true,
      featureFlags: true,
      attendanceEnabled: true,
    },
  });
  const profile = resolveBusinessProfile(
    org?.businessProfile,
    org?.featureFlags,
    org?.attendanceEnabled,
  );
  if (!profile.features.clientsCrm) {
    return NextResponse.json({ error: "CRM desativado" }, { status: 403 });
  }

  // Unifica duplicatas óbvias (mesmo e-mail + mesmo nome) antes de listar.
  await dedupeCustomersByEmailName(ctx.organizationId).catch(() => 0);

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const take = Math.min(100, Number(searchParams.get("take") || 50) || 50);

  const scope = customerScopeWhere(ctx);
  const customers = await prisma.customer.findMany({
    where: {
      ...scope,
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { phoneE164: { contains: q.replace(/\D/g, "") } },
              { email: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take,
    include: {
      bookings: {
        orderBy: { startAt: "desc" },
        take: 1,
        select: {
          id: true,
          startAt: true,
          status: true,
          service: { select: { title: true } },
        },
      },
      _count: { select: { bookings: true } },
    },
  });

  const ids = customers.map((c) => c.id);

  const [bookingPay, cashPay] = ids.length
    ? await Promise.all([
        prisma.booking.findMany({
          where: { customerId: { in: ids } },
          select: {
            id: true,
            customerId: true,
            payment: { select: { status: true, amountCents: true } },
          },
        }),
        prisma.cashEntry.findMany({
          where: {
            organizationId: ctx.organizationId,
            customerId: { in: ids },
            type: "INCOME",
          },
          select: { customerId: true, amountCents: true },
        }),
      ])
    : [[], []];

  const spentByCustomer = new Map<string, number>();
  for (const b of bookingPay) {
    if (!b.customerId || b.payment?.status !== "PAID") continue;
    spentByCustomer.set(
      b.customerId,
      (spentByCustomer.get(b.customerId) || 0) + (b.payment.amountCents || 0),
    );
  }
  for (const e of cashPay) {
    if (!e.customerId) continue;
    spentByCustomer.set(
      e.customerId,
      (spentByCustomer.get(e.customerId) || 0) + (e.amountCents || 0),
    );
  }

  const upcoming = await prisma.booking.findMany({
    where: {
      customerId: { in: ids },
      status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
      startAt: { gte: new Date() },
    },
    orderBy: { startAt: "asc" },
    select: {
      id: true,
      customerId: true,
      startAt: true,
      service: { select: { title: true } },
    },
  });
  const nextByCustomer = new Map<string, (typeof upcoming)[number]>();
  for (const b of upcoming) {
    if (b.customerId && !nextByCustomer.has(b.customerId)) {
      nextByCustomer.set(b.customerId, b);
    }
  }

  return NextResponse.json({
    profile: {
      clientNoun: profile.clientNoun,
      clientNounPlural: profile.clientNounPlural,
      chartNoun: profile.chartNoun,
      visitNoun: profile.visitNoun,
    },
    clients: customers.map((c) => ({
      id: c.id,
      name: c.name,
      phoneE164: c.phoneE164,
      email: c.email,
      cpf: c.cpf,
      bookingsCount: c._count.bookings,
      lastVisit: c.bookings[0]
        ? {
            startAt: c.bookings[0].startAt.toISOString(),
            status: c.bookings[0].status,
            serviceTitle: c.bookings[0].service.title,
          }
        : null,
      nextVisit: nextByCustomer.get(c.id)
        ? {
            startAt: nextByCustomer.get(c.id)!.startAt.toISOString(),
            serviceTitle: nextByCustomer.get(c.id)!.service.title,
          }
        : null,
      spentCents: spentByCustomer.get(c.id) || 0,
    })),
  });
}

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(20),
  email: z
    .union([z.string().trim().email(), z.literal(""), z.null()])
    .optional(),
  cpf: z.union([z.string().trim().max(14), z.literal(""), z.null()]).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export async function POST(req: Request) {
  const auth = await apiRequireStaff();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  try {
    const body = createSchema.parse(await req.json());
    const phoneE164 = toE164(body.phone);
    if (!phoneE164) {
      return NextResponse.json({ error: "Telefone inválido" }, { status: 400 });
    }
    const email = body.email ? body.email.toLowerCase() : null;
    const cpf = body.cpf?.replace(/\D/g, "") || null;

    const byPhone = await prisma.customer.findUnique({
      where: {
        organizationId_phoneE164: {
          organizationId: ctx.organizationId,
          phoneE164,
        },
      },
    });
    if (byPhone) {
      const customer = await prisma.customer.update({
        where: { id: byPhone.id },
        data: {
          name: body.name,
          email,
          ...(cpf ? { cpf } : {}),
          notes: body.notes || null,
        },
      });
      return NextResponse.json(customer, { status: 201 });
    }

    if (email) {
      const byEmail = await prisma.customer.findFirst({
        where: {
          organizationId: ctx.organizationId,
          email: { equals: email },
        },
      });
      if (byEmail) {
        const customer = await prisma.customer.update({
          where: { id: byEmail.id },
          data: {
            name: body.name,
            phoneE164,
            email,
            ...(cpf ? { cpf } : {}),
            notes: body.notes || null,
          },
        });
        return NextResponse.json(customer, { status: 201 });
      }
    }

    const customer = await prisma.customer.create({
      data: {
        organizationId: ctx.organizationId,
        phoneE164,
        name: body.name,
        email,
        cpf,
        notes: body.notes || null,
      },
    });
    return NextResponse.json(customer, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}
