import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiRequireStaff } from "@/lib/rbac";
import { customerScopeWhere } from "@/lib/clients";
import { resolveBusinessProfile } from "@/lib/business-profile";
import { visitRecordSummary } from "@/lib/visit-record";
import { kindLabel } from "@/lib/attendance/kinds";
import { documentPublicPath } from "@/lib/attendance/share";
import {
  bookingStatusLabel,
  moneyMethodLabel,
} from "@/lib/booking-status";
import { formatBRL } from "@/lib/utils";

type TimelineItem = {
  id: string;
  kind: "booking" | "payment" | "note" | "prescription" | "certificate";
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

  const [bookings, notes, prescriptions, certificates, cashEntries] =
    await Promise.all([
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
      profile.features.attendanceCertificates
        ? prisma.attendanceCertificate.findMany({
            where: {
              customerId: customer.id,
              organizationId: ctx.organizationId,
            },
            orderBy: { createdAt: "desc" },
            take: 40,
          })
        : Promise.resolve([]),
      prisma.cashEntry.findMany({
        where: {
          customerId: customer.id,
          organizationId: ctx.organizationId,
          type: "INCOME",
        },
        orderBy: { occurredAt: "desc" },
        take: 40,
      }),
    ]);

  const items: TimelineItem[] = [];

  for (const b of bookings) {
    items.push({
      id: `booking-${b.id}`,
      kind: "booking",
      at: b.startAt.toISOString(),
      title: b.service.title,
      subtitle: [
        bookingStatusLabel(b.status, b.cancelSource),
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
        title: `Pagamento · ${formatBRL(b.payment.amountCents)}`,
        subtitle: moneyMethodLabel(b.payment.method) || undefined,
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
      title: "Registro do atendimento",
      subtitle: visitRecordSummary(n.body),
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

  for (const c of certificates) {
    const shareActive = Boolean(c.shareToken && !c.shareRevokedAt);
    items.push({
      id: `cert-${c.id}`,
      kind: "certificate",
      at: c.createdAt.toISOString(),
      title: kindLabel(c.kind),
      subtitle: c.patientName,
      meta: {
        certificateId: c.id,
        docKind: c.kind,
        pdfUrl: `/api/declaracoes/${c.id}/pdf`,
        printUrl: `/app/declaracoes/${c.id}/imprimir`,
        shareUrl:
          shareActive && c.shareToken
            ? documentPublicPath(c.shareToken)
            : null,
      },
    });
  }

  for (const e of cashEntries) {
    const method = moneyMethodLabel(e.method);
    const desc = e.description?.trim() || "";
    items.push({
      id: `cash-${e.id}`,
      kind: "payment",
      at: e.occurredAt.toISOString(),
      title: `Pagamento recebido · ${formatBRL(e.amountCents)}`,
      subtitle: [method, desc].filter(Boolean).join(" · ") || undefined,
      meta: {
        cashEntryId: e.id,
        amountCents: e.amountCents,
        method: e.method,
        bookingId: e.bookingId,
        source: "manual",
      },
    });
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return NextResponse.json({ items });
}
