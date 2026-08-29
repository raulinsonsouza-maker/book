import { NextResponse } from "next/server";
import { format } from "date-fns";
import type { PaymentMethod, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildPaymentWhere } from "@/lib/payments/org-filter";
import { apiAuthContext, isProfessionalRole } from "@/lib/rbac";

export async function GET(req: Request) {
  const auth = await apiAuthContext();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;
  const orgId = ctx.organizationId;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const status = searchParams.get("status") as PaymentStatus | null;
  const method = searchParams.get("method") as PaymentMethod | null;
  const bookingPageId = searchParams.get("bookingPageId");
  const type = searchParams.get("type");

  const professionalId = isProfessionalRole(ctx.role)
    ? ctx.professionalId
    : searchParams.get("professionalId");

  const payments = await prisma.payment.findMany({
    where: buildPaymentWhere(orgId, {
      from,
      to,
      status,
      method,
      bookingPageId: isProfessionalRole(ctx.role) ? null : bookingPageId,
      type: isProfessionalRole(ctx.role) ? "booking" : type,
      professionalId,
    }),
    include: {
      booking: {
        select: {
          customerName: true,
          service: { select: { title: true } },
          bookingPage: { select: { title: true } },
        },
      },
      checkoutOrder: {
        select: {
          customerName: true,
          product: { select: { title: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const header = [
    "data",
    "tipo",
    "titulo",
    "cliente",
    "metodo",
    "status",
    "valor_centavos",
    "pago_em",
  ];
  const rows = payments.map((p) => {
    const isBooking = Boolean(p.bookingId);
    const title = isBooking
      ? p.booking?.service.title || ""
      : p.checkoutOrder?.product.title || "";
    const customer = isBooking
      ? p.booking?.customerName || ""
      : p.checkoutOrder?.customerName || "";
    return [
      format(p.createdAt, "yyyy-MM-dd HH:mm"),
      isBooking ? "agendamento" : "checkout",
      csvEscape(title),
      csvEscape(customer),
      p.method,
      p.status,
      String(p.amountCents),
      p.paidAt ? format(p.paidAt, "yyyy-MM-dd HH:mm") : "",
    ].join(",");
  });

  const csv = [header.join(","), ...rows].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="financeiro-${format(new Date(), "yyyy-MM-dd")}.csv"`,
    },
  });
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
