import { NextResponse } from "next/server";
import { format } from "date-fns";
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

  const payments = await prisma.payment.findMany({
    where: buildPaymentWhere(orgId, {
      from,
      to,
      status,
      method,
      bookingPageId,
      type,
    }),
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
    take: 5000,
  });

  const header =
    "Data pagamento,Tipo,Cliente,E-mail,Referência,Valor (R$),Status,Método,Referência ID";
  const rows = payments.map((p) => {
    const date = p.paidAt
      ? format(p.paidAt, "yyyy-MM-dd HH:mm")
      : format(p.createdAt, "yyyy-MM-dd HH:mm");
    const value = (p.amountCents / 100).toFixed(2).replace(".", ",");
    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;

    if (p.checkoutOrder) {
      return [
        date,
        "Checkout",
        escape(p.checkoutOrder.customerName),
        escape(p.checkoutOrder.customerEmail),
        escape(p.checkoutOrder.product.title),
        value,
        p.status,
        p.method,
        p.checkoutOrder.id,
      ].join(",");
    }

    return [
      date,
      "Agendamento",
      escape(p.booking!.customerName),
      escape(p.booking!.customerEmail),
      escape(p.booking!.service.title),
      value,
      p.status,
      p.method,
      p.booking!.id,
    ].join(",");
  });

  const csv = [header, ...rows].join("\n");
  const filename = `financeiro-${from || "inicio"}-${to || "fim"}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
