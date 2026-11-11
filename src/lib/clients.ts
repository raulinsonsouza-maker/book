import { prisma } from "@/lib/prisma";
import { toE164 } from "@/lib/whatsapp/phone";
import { isProfessionalRole, type AppRole } from "@/lib/rbac";

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
  bookingId: string;
}) {
  const phoneE164 = toE164(input.phone);
  if (!phoneE164) return null;
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
    },
    create: {
      organizationId: input.organizationId,
      phoneE164,
      name: input.name.trim() || "Cliente",
      email: input.email || null,
    },
  });
  await prisma.booking.updateMany({
    where: { id: input.bookingId, customerId: null },
    data: { customerId: customer.id },
  });
  return customer;
}
