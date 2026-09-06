import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeAccent } from "@/lib/branding";
import { toE164 } from "@/lib/whatsapp/phone";

const PRESET_WEEKDAYS = [1, 2, 3, 4, 5].flatMap((dayOfWeek) => [
  { dayOfWeek, startTime: "09:00", endTime: "12:00" },
  { dayOfWeek, startTime: "13:00", endTime: "18:00" },
]);

export type OnboardingSetupInput = {
  name: string;
  description: string;
  logoUrl?: string | null;
  accentColor?: string;
  businessMode: "SOLO" | "SALON";
  professionals?: { displayName: string; email: string; phone?: string }[];
  services: {
    title: string;
    durationMinutes: number;
    priceCents: number;
  }[];
  availabilityRules?: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }[];
  applyBusinessHours?: boolean;
};

type Tx = Prisma.TransactionClient;

export async function applyOnboardingSetup(
  orgId: string,
  body: OnboardingSetupInput,
  tx: Tx = prisma,
) {
  const org = await tx.organization.update({
    where: { id: orgId },
    data: {
      name: body.name.trim(),
      description: body.description.trim(),
      logoUrl: body.logoUrl || null,
      accentColor: normalizeAccent(body.accentColor || "#0a0a0a"),
      businessMode: body.businessMode,
      onboardingCompletedAt: new Date(),
    },
  });

  let page = await tx.bookingPage.findFirst({
    where: { organizationId: orgId },
    orderBy: { createdAt: "asc" },
  });

  if (!page) {
    page = await tx.bookingPage.create({
      data: {
        organizationId: orgId,
        title: body.name.trim() || "Minha agenda",
        slug: `agenda-${Date.now().toString(36)}`,
        accentColor: normalizeAccent(body.accentColor || "#0a0a0a"),
      },
    });
  } else {
    page = await tx.bookingPage.update({
      where: { id: page.id },
      data: {
        title: body.name.trim() || page.title,
        accentColor: normalizeAccent(body.accentColor || page.accentColor),
      },
    });
  }

  await tx.service.deleteMany({
    where: {
      organizationId: orgId,
      bookings: { none: {} },
    },
  });

  const existingServices = await tx.service.findMany({
    where: { organizationId: orgId },
    select: { id: true },
    orderBy: { sortOrder: "asc" },
  });

  const createdServices = [];
  for (const [i, s] of body.services.entries()) {
    if (i < existingServices.length) {
      const updated = await tx.service.update({
        where: { id: existingServices[i]!.id },
        data: {
          title: s.title.trim(),
          durationMinutes: s.durationMinutes,
          priceCents: s.priceCents,
          isActive: true,
        },
      });
      createdServices.push(updated);
    } else {
      const created = await tx.service.create({
        data: {
          organizationId: orgId,
          title: s.title.trim(),
          durationMinutes: s.durationMinutes,
          priceCents: s.priceCents,
          sortOrder: i,
          isActive: true,
        },
      });
      createdServices.push(created);
    }
  }

  const hourRules =
    body.availabilityRules && body.availabilityRules.length > 0
      ? body.availabilityRules
      : PRESET_WEEKDAYS;

  if (body.applyBusinessHours !== false) {
    await tx.availabilityRule.deleteMany({
      where: { bookingPageId: page.id, professionalId: null },
    });
    await tx.availabilityRule.createMany({
      data: hourRules.map((r) => ({
        bookingPageId: page.id,
        dayOfWeek: r.dayOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
      })),
    });
  }

  const serviceIds = createdServices.map((s) => s.id);

  await tx.bookingPageService.deleteMany({
    where: { bookingPageId: page.id },
  });
  if (serviceIds.length) {
    await tx.bookingPageService.createMany({
      data: serviceIds.map((serviceId, i) => ({
        bookingPageId: page.id,
        serviceId,
        sortOrder: i,
      })),
    });
  }

  const proIds: string[] = [];

  if (body.businessMode === "SALON") {
    const entries = (body.professionals || [])
      .map((p) => ({
        displayName: p.displayName.trim(),
        email: p.email.trim().toLowerCase(),
        phone: toE164(p.phone || "") || null,
      }))
      .filter((p) => p.displayName.length >= 2 && p.email.includes("@"));

    const existingPros = await tx.professional.findMany({
      where: { organizationId: orgId },
      select: { id: true, membershipId: true },
    });

    for (const [i, entry] of entries.entries()) {
      const { displayName, email, phone } = entry;

      if (i < existingPros.length) {
        const existing = existingPros[i]!;
        const membership = await tx.membership.findUnique({
          where: { id: existing.membershipId },
          select: { userId: true },
        });
        if (membership) {
          await tx.user.update({
            where: { id: membership.userId },
            data: {
              name: displayName,
              email,
              mustChangePassword: true,
            },
          });
        }
        const pro = await tx.professional.update({
          where: { id: existing.id },
          data: { displayName, phone, isActive: true, sortOrder: i },
        });
        await tx.professionalService.deleteMany({
          where: { professionalId: pro.id },
        });
        if (serviceIds.length) {
          await tx.professionalService.createMany({
            data: serviceIds.map((serviceId) => ({
              professionalId: pro.id,
              serviceId,
            })),
          });
        }
        await tx.availabilityRule.deleteMany({
          where: { professionalId: pro.id },
        });
        if (body.applyBusinessHours !== false) {
          await tx.availabilityRule.createMany({
            data: hourRules.map((r) => ({
              professionalId: pro.id,
              dayOfWeek: r.dayOfWeek,
              startTime: r.startTime,
              endTime: r.endTime,
            })),
          });
        }
        proIds.push(pro.id);
        continue;
      }

      const taken = await tx.user.findUnique({ where: { email } });
      if (taken) {
        throw new Error(`E-mail já cadastrado: ${email}`);
      }

      const passwordHash = await bcrypt.hash(
        `tmp-${Math.random().toString(36).slice(2, 12)}`,
        10,
      );

      const user = await tx.user.create({
        data: {
          email,
          name: displayName,
          passwordHash,
          mustChangePassword: true,
        },
      });
      const membership = await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: orgId,
          role: "PROFESSIONAL",
        },
      });
      const pro = await tx.professional.create({
        data: {
          organizationId: orgId,
          membershipId: membership.id,
          displayName,
          phone,
          sortOrder: i,
          services: serviceIds.length
            ? {
                create: serviceIds.map((serviceId) => ({ serviceId })),
              }
            : undefined,
        },
      });
      if (body.applyBusinessHours !== false) {
        await tx.availabilityRule.createMany({
          data: hourRules.map((r) => ({
            professionalId: pro.id,
            dayOfWeek: r.dayOfWeek,
            startTime: r.startTime,
            endTime: r.endTime,
          })),
        });
      }
      proIds.push(pro.id);
    }
  }

  return {
    organizationId: org.id,
    organizationSlug: org.slug,
    bookingPageId: page.id,
    bookingPageSlug: page.slug,
    professionalIds: proIds,
    serviceIds,
  };
}
