import { NextResponse } from "next/server";
import type { PaymentMethod, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildPaymentWhere } from "@/lib/payments/org-filter";
import { getAuthorizedOrganizationId } from "@/lib/session";

export async function GET(req: Request) {
  const orgId = await getAuthorizedOrganizationId();
  if (!orgId) {
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

  const where = buildPaymentWhere(orgId, {
    from,
    to,
    status,
    method,
    bookingPageId,
    type,
  });

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
      where: { AND: [where, { status: "PAID" }] },
      _sum: { amountCents: true },
    }),
    prisma.payment.aggregate({
      where: { AND: [where, { status: "PENDING" }] },
      _sum: { amountCents: true },
    }),
    prisma.payment.count({ where: { AND: [where, { status: "PAID" }] } }),
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
