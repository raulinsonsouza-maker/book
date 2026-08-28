import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import type { PaymentMethod, PaymentStatus } from "@prisma/client";

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

  const paidAtRange: { gte?: Date; lte?: Date } = {};
  if (from) paidAtRange.gte = new Date(from);
  if (to) paidAtRange.lte = new Date(`${to}T23:59:59.999Z`);
  const periodFilter =
    Object.keys(paidAtRange).length > 0
      ? { OR: [{ paidAt: paidAtRange }, { paidAt: null, createdAt: paidAtRange }] }
      : {};

  const payments = await prisma.payment.findMany({
    where: {
      booking: {
        bookingPage: {
          organizationId: session.user.organizationId,
          ...(bookingPageId ? { id: bookingPageId } : {}),
        },
      },
      ...(status ? { status } : {}),
      ...(method ? { method } : {}),
      ...periodFilter,
    },
    include: {
      booking: {
        include: {
          service: true,
          bookingPage: { select: { title: true } },
        },
      },
    },
    orderBy: { paidAt: "desc" },
    take: 5000,
  });

  const header =
    "Data pagamento,Cliente,E-mail,Serviço,Página,Valor (R$),Status,Método,Agendamento ID";
  const rows = payments.map((p) => {
    const date = p.paidAt
      ? format(p.paidAt, "yyyy-MM-dd HH:mm")
      : format(p.createdAt, "yyyy-MM-dd HH:mm");
    const value = (p.amountCents / 100).toFixed(2).replace(".", ",");
    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
    return [
      date,
      escape(p.booking.customerName),
      escape(p.booking.customerEmail),
      escape(p.booking.service.title),
      escape(p.booking.bookingPage.title),
      value,
      p.status,
      p.method,
      p.booking.id,
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
