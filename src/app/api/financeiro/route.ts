import { NextResponse } from "next/server";
import type { PaymentMethod, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { commissionCents } from "@/lib/payments/commission";
import { buildPaymentWhere } from "@/lib/payments/org-filter";
import { apiAuthContext, isProfessionalRole, resolveProfessionalScope } from "@/lib/rbac";

export async function GET(req: Request) {
  const auth = await apiAuthContext();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;
  const orgId = ctx.organizationId;

  if (isProfessionalRole(ctx.role) && !ctx.professionalId) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
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

  const isPro = isProfessionalRole(ctx.role);
  const professionalId = resolveProfessionalScope(
    ctx,
    searchParams.get("professionalId"),
  );

  const where = buildPaymentWhere(orgId, {
    from,
    to,
    status,
    method,
    bookingPageId: isPro ? null : bookingPageId,
    type: isPro ? "booking" : type,
    professionalId,
  });

  const [payments, total, paidAgg, pendingAgg, paidCount, chartRows, paidBookingRows] =
    await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        booking: {
          include: {
            service: true,
            bookingPage: { select: { title: true } },
            professional: {
              select: {
                id: true,
                displayName: true,
                commissionEnabled: true,
                commissionPercent: true,
              },
            },
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
    prisma.payment.findMany({
      where,
      select: {
        amountCents: true,
        status: true,
        method: true,
        paidAt: true,
        createdAt: true,
      },
    }),
    prisma.payment.findMany({
      where: { AND: [where, { status: "PAID", bookingId: { not: null } }] },
      select: {
        amountCents: true,
        booking: {
          select: {
            professional: {
              select: {
                commissionEnabled: true,
                commissionPercent: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const receitas = paidAgg._sum.amountCents || 0;
  const pendente = pendingAgg._sum.amountCents || 0;
  const ticketMedio = paidCount > 0 ? Math.round(receitas / paidCount) : 0;

  let comissaoTotal = 0;
  for (const row of paidBookingRows) {
    const pro = row.booking?.professional;
    comissaoTotal += commissionCents(row.amountCents, {
      enabled: pro?.commissionEnabled,
      percent: pro?.commissionPercent,
    });
  }
  const liquidoSalao = Math.max(0, receitas - comissaoTotal);

  function ymdLocal(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const byDayMap = new Map<string, number>();
  const byMethodMap = new Map<string, { amountCents: number; count: number }>();
  const byStatusMap = new Map<string, { amountCents: number; count: number }>();

  for (const row of chartRows) {
    const statusKey = row.status;
    const prevStatus = byStatusMap.get(statusKey) || {
      amountCents: 0,
      count: 0,
    };
    byStatusMap.set(statusKey, {
      amountCents: prevStatus.amountCents + row.amountCents,
      count: prevStatus.count + 1,
    });

    const methodKey = row.method;
    const prevMethod = byMethodMap.get(methodKey) || {
      amountCents: 0,
      count: 0,
    };
    byMethodMap.set(methodKey, {
      amountCents: prevMethod.amountCents + row.amountCents,
      count: prevMethod.count + 1,
    });

    if (row.status === "PAID") {
      const day = ymdLocal(row.paidAt || row.createdAt);
      byDayMap.set(day, (byDayMap.get(day) || 0) + row.amountCents);
    }
  }

  const byDay: { date: string; amountCents: number }[] = [];
  if (from && to) {
    const start = new Date(`${from}T12:00:00`);
    const end = new Date(`${to}T12:00:00`);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const cursor = new Date(start);
      let guard = 0;
      while (cursor <= end && guard < 400) {
        const key = ymdLocal(cursor);
        byDay.push({ date: key, amountCents: byDayMap.get(key) || 0 });
        cursor.setDate(cursor.getDate() + 1);
        guard += 1;
      }
    }
  }
  if (byDay.length === 0) {
    for (const [date, amountCents] of Array.from(byDayMap.entries()).sort(
      ([a], [b]) => a.localeCompare(b),
    )) {
      byDay.push({ date, amountCents });
    }
  }

  const byMethod = Array.from(byMethodMap.entries()).map(
    ([method, data]) => ({ method, ...data }),
  );
  const byStatus = Array.from(byStatusMap.entries()).map(
    ([status, data]) => ({ status, ...data }),
  );

  return NextResponse.json({
    summary: {
      receitas,
      pendente,
      confirmados: paidCount,
      ticketMedio,
      comissaoTotal,
      liquidoSalao,
    },
    series: { byDay, byMethod, byStatus },
    payments: payments.map((p) => {
      if (p.checkoutOrder) {
        return {
          id: p.id,
          type: "checkout" as const,
          status: p.status,
          method: p.method,
          amountCents: p.amountCents,
          commissionCents: 0,
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
      const pro = p.booking!.professional;
      const commission = commissionCents(p.amountCents, {
        enabled: pro?.commissionEnabled,
        percent: pro?.commissionPercent,
      });
      return {
        id: p.id,
        type: "booking" as const,
        status: p.status,
        method: p.method,
        amountCents: p.amountCents,
        commissionCents: commission,
        paidAt: p.paidAt?.toISOString() || null,
        createdAt: p.createdAt.toISOString(),
        booking: {
          id: p.booking!.id,
          customerName: p.booking!.customerName,
          customerEmail: p.booking!.customerEmail,
          startAt: p.booking!.startAt.toISOString(),
          serviceTitle: p.booking!.service.title,
          pageTitle: p.booking!.bookingPage.title,
          professionalName: pro?.displayName || null,
          commissionPercent: pro?.commissionEnabled
            ? pro.commissionPercent
            : null,
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
