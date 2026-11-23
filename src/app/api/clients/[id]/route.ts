import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiRequireStaff } from "@/lib/rbac";
import {
  backfillCustomerBookings,
  customerScopeWhere,
} from "@/lib/clients";
import { resolveBusinessProfile } from "@/lib/business-profile";
import { RECEITA_KIND } from "@/lib/attendance/kinds";
import { documentPublicPath } from "@/lib/attendance/share";
import { toE164 } from "@/lib/whatsapp/phone";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(8).max(20),
  email: z
    .union([z.string().trim().email().max(160), z.literal(""), z.null()])
    .optional(),
  cpf: z.union([z.string().trim().max(14), z.literal(""), z.null()]).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await apiRequireStaff();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;
  const { id } = await params;

  const scope = customerScopeWhere(ctx);
  const customer = await prisma.customer.findFirst({
    where: { id, ...scope },
  });
  if (!customer) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  // Não bloqueia a resposta do prontuário; vincula bookings órfãos em background.
  void backfillCustomerBookings({
    organizationId: ctx.organizationId,
    customerId: customer.id,
    phoneE164: customer.phoneE164,
    email: customer.email,
  }).catch(() => null);

  if (!customer.cpf) {
    const withCpf = await prisma.booking.findFirst({
      where: {
        customerId: customer.id,
        customerCpf: { not: null },
      },
      orderBy: { createdAt: "desc" },
      select: { customerCpf: true },
    });
    if (withCpf?.customerCpf) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { cpf: withCpf.customerCpf },
      });
      customer.cpf = withCpf.customerCpf;
    }
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

  const [bookings, notes, prescriptions, receitaDocs, cashEntries] =
    await Promise.all([
      prisma.booking.findMany({
        where: {
          customerId: customer.id,
          bookingPage: { organizationId: ctx.organizationId },
        },
        include: {
          service: { select: { title: true, imageUrl: true } },
          professional: { select: { displayName: true, photoUrl: true } },
          payment: true,
          bookingPage: { select: { title: true } },
        },
        orderBy: { startAt: "desc" },
        take: 100,
      }),
      prisma.visitNote.findMany({
        where: { customerId: customer.id, organizationId: ctx.organizationId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      profile.features.prescriptions
        ? prisma.prescription.findMany({
            where: {
              customerId: customer.id,
              organizationId: ctx.organizationId,
            },
            orderBy: { issuedAt: "desc" },
            take: 50,
          })
        : Promise.resolve([]),
      profile.features.prescriptions
        ? prisma.attendanceCertificate.findMany({
            where: {
              customerId: customer.id,
              organizationId: ctx.organizationId,
              kind: RECEITA_KIND,
            },
            orderBy: { createdAt: "desc" },
            take: 50,
          })
        : Promise.resolve([]),
      prisma.cashEntry.findMany({
        where: {
          customerId: customer.id,
          organizationId: ctx.organizationId,
          type: "INCOME",
        },
        orderBy: { occurredAt: "desc" },
        take: 50,
      }),
    ]);

  const spentFromBookings = bookings.reduce((acc, b) => {
    if (b.payment?.status === "PAID") return acc + (b.payment.amountCents || 0);
    return acc;
  }, 0);
  const spentFromCash = cashEntries.reduce(
    (acc, e) => acc + (e.amountCents || 0),
    0,
  );
  const spentCents = spentFromBookings + spentFromCash;

  return NextResponse.json({
    profile: {
      clientNoun: profile.clientNoun,
      clientNounPlural: profile.clientNounPlural,
      visitNoun: profile.visitNoun,
      visitNounPlural: profile.visitNounPlural,
      chartNoun: profile.chartNoun,
      features: profile.features,
    },
    customer: {
      id: customer.id,
      name: customer.name,
      phoneE164: customer.phoneE164,
      email: customer.email,
      cpf: customer.cpf,
      notes: customer.notes,
      createdAt: customer.createdAt.toISOString(),
    },
    spentCents,
    bookings: bookings.map((b) => ({
      id: b.id,
      status: b.status,
      startAt: b.startAt.toISOString(),
      endAt: b.endAt.toISOString(),
      timezone: b.timezone,
      customerName: b.customerName,
      customerEmail: b.customerEmail,
      customerPhone: b.customerPhone,
      customerCpf: b.customerCpf,
      customAnswers: parseAnswers(b.customAnswers),
      serviceTitle: b.service.title,
      serviceImageUrl: b.service.imageUrl,
      professionalName: b.professional?.displayName ?? null,
      professionalPhotoUrl: b.professional?.photoUrl ?? null,
      pageTitle: b.bookingPage.title,
      paymentStatus: b.payment?.status ?? null,
      paymentMethod: b.payment?.method ?? null,
      paymentAmountCents: b.payment?.amountCents ?? null,
    })),
    notes: notes.map((n) => ({
      id: n.id,
      body: n.body,
      bookingId: n.bookingId,
      createdAt: n.createdAt.toISOString(),
    })),
    prescriptions: prescriptions.map((p) => ({
      id: p.id,
      items: safeJson(p.items),
      notes: p.notes,
      bookingId: p.bookingId,
      issuedAt: p.issuedAt.toISOString(),
    })),
    receitaDocs: receitaDocs.map((d) => {
      const shareActive = Boolean(d.shareToken && !d.shareRevokedAt);
      return {
        id: d.id,
        bodyText: d.bodyText,
        issuedAt: d.issuedAt.toISOString(),
        createdAt: d.createdAt.toISOString(),
        visitDate: d.visitDate,
        pdfUrl: `/api/declaracoes/${d.id}/pdf`,
        printUrl: `/app/declaracoes/${d.id}/imprimir`,
        editUrl: `/app/declaracoes?customerId=${customer.id}&editId=${d.id}`,
        shareUrl:
          shareActive && d.shareToken
            ? documentPublicPath(d.shareToken)
            : null,
      };
    }),
    cashEntries: cashEntries.map((e) => ({
      id: e.id,
      amountCents: e.amountCents,
      method: e.method,
      description: e.description,
      occurredAt: e.occurredAt.toISOString(),
      bookingId: e.bookingId,
      source: "manual" as const,
    })),
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await apiRequireStaff();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;
  const { id } = await params;

  const existing = await prisma.customer.findFirst({
    where: { id, ...customerScopeWhere(ctx) },
  });
  if (!existing) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  try {
    const body = updateSchema.parse(await req.json());
    const phoneE164 = toE164(body.phone);
    if (!phoneE164) {
      return NextResponse.json({ error: "Telefone inválido" }, { status: 400 });
    }

    if (phoneE164 !== existing.phoneE164) {
      const clash = await prisma.customer.findFirst({
        where: {
          organizationId: ctx.organizationId,
          phoneE164,
          NOT: { id },
        },
        select: { id: true },
      });
      if (clash) {
        return NextResponse.json(
          { error: "Já existe um cadastro com este telefone" },
          { status: 409 },
        );
      }
    }

    const email =
      body.email === undefined
        ? existing.email
        : body.email
          ? body.email.toLowerCase()
          : null;
    const cpf =
      body.cpf === undefined
        ? existing.cpf
        : body.cpf?.replace(/\D/g, "") || null;

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: body.name,
        phoneE164,
        email,
        cpf,
        notes:
          body.notes === undefined ? existing.notes : body.notes?.trim() || null,
      },
    });

    return NextResponse.json({
      id: customer.id,
      name: customer.name,
      phoneE164: customer.phoneE164,
      email: customer.email,
      cpf: customer.cpf,
      notes: customer.notes,
      createdAt: customer.createdAt.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}

function safeJson(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function parseAnswers(raw: string | null) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    /* ignore */
  }
  return null;
}
