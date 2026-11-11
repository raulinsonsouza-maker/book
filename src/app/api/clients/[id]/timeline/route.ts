import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiRequireStaff } from "@/lib/rbac";
import { customerScopeWhere } from "@/lib/clients";
import { resolveBusinessProfile } from "@/lib/business-profile";

type TimelineItem = {
  id: string;
  kind: "booking" | "payment" | "note" | "prescription";
  at: string;
  title: string;
  subtitle?: string;
  meta?: Record<string, unknown>;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await apiRequireStaff();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;
  const { id } = await params;

  const customer = await prisma.customer.findFirst({
    where: { id, ...customerScopeWhere(ctx) },
  });
  if (!customer) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

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

  const [bookings, notes, prescriptions] = await Promise.all([
    prisma.booking.findMany({
      where: {
        customerId: customer.id,
        bookingPage: { organizationId: ctx.organizationId },
      },
      include: {
        service: { select: { title: true } },
        professional: { select: { displayName: true } },
        payment: true,
      },
      orderBy: { startAt: "desc" },
      take: 80,
    }),
    prisma.visitNote.findMany({
      where: { customerId: customer.id, organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    profile.features.prescriptions
      ? prisma.prescription.findMany({
          where: {
            customerId: customer.id,
            organizationId: ctx.organizationId,
          },
          orderBy: { issuedAt: "desc" },
          take: 40,
        })
      : Promise.resolve([]),
  ]);

  const items: TimelineItem[] = [];

  for (const b of bookings) {
    items.push({
      id: `booking-${b.id}`,
      kind: "booking",
      at: b.startAt.toISOString(),
      title: b.service.title,
      subtitle: [
        b.status,
        b.professional?.displayName,
      ]
        .filter(Boolean)
        .join(" · "),
      meta: {
        bookingId: b.id,
        status: b.status,
        endAt: b.endAt.toISOString(),
      },
    });
    if (b.payment?.status === "PAID" && b.payment.paidAt) {
      items.push({
        id: `payment-${b.payment.id}`,
        kind: "payment",
        at: b.payment.paidAt.toISOString(),
        title: `Pagamento · R$ ${(b.payment.amountCents / 100).toFixed(2)}`,
        subtitle: b.payment.method,
        meta: {
          bookingId: b.id,
          amountCents: b.payment.amountCents,
          method: b.payment.method,
        },
      });
    }
  }

  for (const n of notes) {
    items.push({
      id: `note-${n.id}`,
      kind: "note",
      at: n.createdAt.toISOString(),
      title: "Nota no prontuário",
      subtitle: n.body.slice(0, 120),
      meta: { noteId: n.id, bookingId: n.bookingId },
    });
  }

  for (const p of prescriptions) {
    let count = 0;
    try {
      count = (JSON.parse(p.items) as unknown[]).length;
    } catch {
      count = 0;
    }
    items.push({
      id: `rx-${p.id}`,
      kind: "prescription",
      at: p.issuedAt.toISOString(),
      title: "Prescrição / orientação",
      subtitle: `${count} item(ns)`,
      meta: { prescriptionId: p.id, bookingId: p.bookingId },
    });
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return NextResponse.json({ items });
}
