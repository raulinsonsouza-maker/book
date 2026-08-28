import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { PaymentMethod, PaymentStatus } from "@prisma/client";

function parsePeriodFilter(from: string | null, to: string | null) {
  if (!from && !to) return undefined;
  const range: { gte?: Date; lte?: Date } = {};
  if (from) range.gte = new Date(from);
  if (to) range.lte = new Date(`${to}T23:59:59.999Z`);
  return {
    OR: [{ paidAt: range }, { paidAt: null, createdAt: range }],
  };
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const status = searchParams.get("status") as PaymentStatus | null;
  const method = searchParams.get("method") as PaymentMethod | null;
  const bookingPageId = searchParams.get("bookingPageId");
  const type = searchParams.get("type");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = 50;
  const orgId = session.user.organizationId;

  const periodFilter = parsePeriodFilter(from, to);
  const orgFilter =
    type === "booking"
      ? {
          booking: {
            bookingPage: {
              organizationId: orgId,
              ...(bookingPageId ? { id: bookingPageId } : {}),
            },
          },
        }
      : type === "checkout"
        ? {
            checkoutOrder: {
              product: { organizationId: orgId },
            },
          }
        : {
            OR: [
              {
                booking: {
                  bookingPage: {
                    organizationId: orgId,
                    ...(bookingPageId ? { id: bookingPageId } : {}),
                  },
                },
              },
              {
                checkoutOrder: {
                  product: { organizationId: orgId },
                },
              },
            ],
          };

  const where = {
    ...orgFilter,
    ...(status ? { status } : {}),
    ...(method ? { method } : {}),
    ...(periodFilter || {}),
  };

  const [payments, total, paidAgg, pendingAgg, paidCount] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        booking: {
          include: {
            service: true,
            bookingPage: { select: { title: true } },
          },
        },
        checkoutOrder: {
          include: {
            product: { select: { title: true } },
          },
        },
      },
      orderBy: { paidAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({
      where: { ...where, status: "PAID" },
      _sum: { amountCents: true },
    }),
    prisma.payment.aggregate({
      where: { ...where, status: "PENDING" },
      _sum: { amountCents: true },
    }),
    prisma.payment.count({ where: { ...where, status: "PAID" } }),
  ]);

  const receitas = paidAgg._sum.amountCents || 0;
  const pendente = pendingAgg._sum.amountCents || 0;
  const ticketMedio = paidCount > 0 ? Math.round(receitas / paidCount) : 0;

  return NextResponse.json({
    summary: {
      receitas,
      pendente,
      confirmados: paidCount,
      ticketMedio,
    },
    payments: payments.map((p) => {
      if (p.checkoutOrder) {
        return {
          id: p.id,
          type: "checkout" as const,
          status: p.status,
          method: p.method,
          amountCents: p.amountCents,
          paidAt: p.paidAt?.toISOString() || null,
          createdAt: p.createdAt.toISOString(),
          checkout: {
            id: p.checkoutOrder.id,
            customerName: p.checkoutOrder.customerName,
            customerEmail: p.checkoutOrder.customerEmail,
            productTitle: p.checkoutOrder.product.title,
          },
        };
      }
      return {
        id: p.id,
        type: "booking" as const,
        status: p.status,
        method: p.method,
        amountCents: p.amountCents,
        paidAt: p.paidAt?.toISOString() || null,
        createdAt: p.createdAt.toISOString(),
        booking: {
          id: p.booking!.id,
          customerName: p.booking!.customerName,
          customerEmail: p.booking!.customerEmail,
          startAt: p.booking!.startAt.toISOString(),
          serviceTitle: p.booking!.service.title,
          pageTitle: p.booking!.bookingPage.title,
        },
      };
    }),
    pagination: {
      page,
      pageSize,
      total,
      pages: Math.ceil(total / pageSize),
    },
  });
}
