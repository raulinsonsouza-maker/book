import { prisma } from "@/lib/prisma";
import { toE164 } from "@/lib/whatsapp/phone";
import { isProfessionalRole, type AppRole } from "@/lib/rbac";
import { formatCpf } from "@/lib/utils";
import type { FormFieldConfig } from "@/types/funnel-config";

export function customerScopeWhere(ctx: {
  organizationId: string;
  role: AppRole;
  professionalId: string | null;
}) {
  if (isProfessionalRole(ctx.role) && ctx.professionalId) {
    return {
      organizationId: ctx.organizationId,
      bookings: { some: { professionalId: ctx.professionalId } },
    } as const;
  }
  return { organizationId: ctx.organizationId } as const;
}

/** Link orphan bookings sharing phone/email to a customer. */
export async function backfillCustomerBookings(input: {
  organizationId: string;
  customerId: string;
  phoneE164: string;
  email?: string | null;
}) {
  // Bookings store raw phone; match common variants via endsWith digits
  const digits = input.phoneE164.replace(/\D/g, "");
  if (!digits) return 0;

  const bookings = await prisma.booking.findMany({
    where: {
      bookingPage: { organizationId: input.organizationId },
      customerId: null,
      OR: [
        { customerPhone: { contains: digits.slice(-8) } },
        ...(input.email
          ? [{ customerEmail: { equals: input.email } }]
          : []),
      ],
    },
    select: { id: true, customerPhone: true },
    take: 200,
  });
  const ids = bookings
    .filter((b) => {
      const d = (b.customerPhone || "").replace(/\D/g, "");
      return d.endsWith(digits.slice(-8)) || d === digits;
    })
    .map((b) => b.id);
  if (ids.length) {
    await prisma.booking.updateMany({
      where: { id: { in: ids } },
      data: { customerId: input.customerId },
    });
  }
  return ids.length;
}

function normalizeCustomerEmail(email?: string | null) {
  const v = email?.trim().toLowerCase() || "";
  return v.includes("@") ? v : null;
}

function normalizeCustomerName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Funde absorb → keep: agendas, caixa, prontuário e documentos. */
export async function mergeCustomers(input: {
  organizationId: string;
  keepId: string;
  absorbId: string;
}) {
  const { organizationId, keepId, absorbId } = input;
  if (keepId === absorbId) return keepId;

  const [keep, absorb] = await Promise.all([
    prisma.customer.findFirst({
      where: { id: keepId, organizationId },
    }),
    prisma.customer.findFirst({
      where: { id: absorbId, organizationId },
    }),
  ]);
  if (!keep || !absorb) {
    throw new Error("Cliente não encontrado para unificação");
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.updateMany({
      where: { customerId: absorbId },
      data: { customerId: keepId },
    });
    await tx.cashEntry.updateMany({
      where: { customerId: absorbId },
      data: { customerId: keepId },
    });
    await tx.visitNote.updateMany({
      where: { customerId: absorbId },
      data: { customerId: keepId },
    });
    await tx.prescription.updateMany({
      where: { customerId: absorbId },
      data: { customerId: keepId },
    });
    await tx.customerSession.updateMany({
      where: { customerId: absorbId },
      data: { customerId: keepId },
    });
    await tx.attendanceCertificate.updateMany({
      where: { customerId: absorbId },
      data: { customerId: keepId },
    });
    await tx.whatsAppMessageLog.updateMany({
      where: { customerId: absorbId },
      data: { customerId: keepId },
    });

    const notes =
      keep.notes && absorb.notes && keep.notes !== absorb.notes
        ? `${keep.notes.trim()}\n\n${absorb.notes.trim()}`
        : keep.notes || absorb.notes;

    await tx.customer.update({
      where: { id: keepId },
      data: {
        email: keep.email || absorb.email,
        cpf: keep.cpf || absorb.cpf,
        notes: notes || null,
        name: keep.name.trim() || absorb.name,
      },
    });
    await tx.customer.delete({ where: { id: absorbId } });
  });

  return keepId;
}

/** Une cadastros da mesma org com mesmo e-mail + mesmo nome. */
export async function dedupeCustomersByEmailName(organizationId: string) {
  const rows = await prisma.customer.findMany({
    where: {
      organizationId,
      email: { not: null },
    },
    select: {
      id: true,
      email: true,
      name: true,
      phoneE164: true,
      updatedAt: true,
      _count: { select: { bookings: true, cashEntries: true } },
    },
    take: 500,
  });

  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const email = normalizeCustomerEmail(row.email);
    if (!email) continue;
    const key = `${email}::${normalizeCustomerName(row.name)}`;
    const list = groups.get(key) || [];
    list.push(row);
    groups.set(key, list);
  }

  let merged = 0;
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => {
      const score =
        b._count.bookings +
        b._count.cashEntries -
        (a._count.bookings + a._count.cashEntries);
      if (score !== 0) return score;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
    const keep = list[0]!;
    for (const absorb of list.slice(1)) {
      await mergeCustomers({
        organizationId,
        keepId: keep.id,
        absorbId: absorb.id,
      });
      merged += 1;
    }
  }
  return merged;
}

export async function ensureCustomerFromBooking(input: {
  organizationId: string;
  phone: string;
  name: string;
  email?: string | null;
  cpf?: string | null;
  bookingId: string;
  customAnswers?: Record<string, string> | null;
  formFields?: FormFieldConfig[] | null;
}) {
  const phoneE164 = toE164(input.phone);
  if (!phoneE164) return null;

  const cpfDigits = input.cpf?.replace(/\D/g, "") || null;
  const email = normalizeCustomerEmail(input.email);
  const name = input.name.trim() || "Cliente";

  let existing = await prisma.customer.findUnique({
    where: {
      organizationId_phoneE164: {
        organizationId: input.organizationId,
        phoneE164,
      },
    },
  });

  // Evita duplicata por typo de telefone: reusa cadastro com mesmo e-mail+nome.
  if (!existing && email) {
    const byEmail = await prisma.customer.findMany({
      where: {
        organizationId: input.organizationId,
        email: { equals: email },
      },
      take: 10,
    });
    existing =
      byEmail.find(
        (c) => normalizeCustomerName(c.name) === normalizeCustomerName(name),
      ) ||
      byEmail[0] ||
      null;
  }

  let customer;
  let isNewPatient = false;
  if (existing) {
    let nextPhone = existing.phoneE164;
    if (existing.phoneE164 !== phoneE164) {
      const phoneTaken = await prisma.customer.findUnique({
        where: {
          organizationId_phoneE164: {
            organizationId: input.organizationId,
            phoneE164,
          },
        },
        select: { id: true },
      });
      if (!phoneTaken) nextPhone = phoneE164;
    }
    customer = await prisma.customer.update({
      where: { id: existing.id },
      data: {
        name: name || undefined,
        phoneE164: nextPhone,
        ...(email ? { email } : {}),
        ...(cpfDigits ? { cpf: cpfDigits } : {}),
      },
    });
  } else {
    isNewPatient = true;
    customer = await prisma.customer.create({
      data: {
        organizationId: input.organizationId,
        phoneE164,
        name,
        email,
        cpf: cpfDigits,
      },
    });
  }

  await prisma.booking.updateMany({
    where: { id: input.bookingId, customerId: null },
    data: { customerId: customer.id },
  });

  await seedIntakeNoteFromBooking({
    organizationId: input.organizationId,
    customerId: customer.id,
    bookingId: input.bookingId,
    isNewPatient,
    cpf: cpfDigits,
    customAnswers: input.customAnswers,
    formFields: input.formFields,
  });

  return customer;
}

/** Grava no prontuário as respostas do funil (e CPF) para o médico. */
export async function seedIntakeNoteFromBooking(input: {
  organizationId: string;
  customerId: string;
  bookingId: string;
  isNewPatient: boolean;
  cpf?: string | null;
  customAnswers?: Record<string, string> | null;
  formFields?: FormFieldConfig[] | null;
}) {
  const answers = input.customAnswers || {};
  const answerEntries = Object.entries(answers).filter(
    ([, v]) => typeof v === "string" && v.trim(),
  );
  if (!input.cpf && answerEntries.length === 0) return null;

  const already = await prisma.visitNote.findFirst({
    where: {
      organizationId: input.organizationId,
      customerId: input.customerId,
      bookingId: input.bookingId,
    },
    select: { id: true },
  });
  if (already) return already;

  const labelById = new Map(
    (input.formFields || []).map((f) => [f.id, f.label] as const),
  );

  const lines: string[] = [
    input.isNewPatient
      ? "Cadastro via agendamento online (novo paciente)."
      : "Atualização via agendamento online.",
  ];
  if (input.cpf) {
    lines.push(`CPF: ${formatCpf(input.cpf)}`);
  }
  for (const [id, value] of answerEntries) {
    const label = labelById.get(id) || id;
    lines.push(`${label}: ${value.trim()}`);
  }

  return prisma.visitNote.create({
    data: {
      organizationId: input.organizationId,
      customerId: input.customerId,
      bookingId: input.bookingId,
      body: lines.join("\n"),
    },
  });
}
