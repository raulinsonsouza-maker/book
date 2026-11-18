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
  const existing = await prisma.customer.findUnique({
    where: {
      organizationId_phoneE164: {
        organizationId: input.organizationId,
        phoneE164,
      },
    },
    select: { id: true },
  });

  const customer = await prisma.customer.upsert({
    where: {
      organizationId_phoneE164: {
        organizationId: input.organizationId,
        phoneE164,
      },
    },
    update: {
      name: input.name.trim() || undefined,
      email: input.email || undefined,
      ...(cpfDigits ? { cpf: cpfDigits } : {}),
    },
    create: {
      organizationId: input.organizationId,
      phoneE164,
      name: input.name.trim() || "Cliente",
      email: input.email || null,
      cpf: cpfDigits,
    },
  });

  await prisma.booking.updateMany({
    where: { id: input.bookingId, customerId: null },
    data: { customerId: customer.id },
  });

  await seedIntakeNoteFromBooking({
    organizationId: input.organizationId,
    customerId: customer.id,
    bookingId: input.bookingId,
    isNewPatient: !existing,
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
