import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiRequireAdmin } from "@/lib/rbac";
import { DESCRIPTION_MAX, normalizeAccent } from "@/lib/branding";
import { ASAAS_ENABLED } from "@/lib/feature-flags";

const PRESET_WEEKDAYS = [1, 2, 3, 4, 5].flatMap((dayOfWeek) => [
  { dayOfWeek, startTime: "09:00", endTime: "12:00" },
  { dayOfWeek, startTime: "13:00", endTime: "18:00" },
]);

const serviceSchema = z.object({
  title: z.string().min(2).max(80),
  durationMinutes: z.number().int().min(5).max(480),
  priceCents: z.number().int().min(0),
});

const schema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().min(2).max(DESCRIPTION_MAX),
  logoUrl: z.string().nullable().optional(),
  accentColor: z.string().optional(),
  businessMode: z.enum(["SOLO", "SALON"]),
  professionals: z
    .array(z.object({ displayName: z.string().min(2).max(80) }))
    .max(20)
    .optional(),
  services: z.array(serviceSchema).min(1).max(30),
  applyBusinessHours: z.boolean().optional().default(true),
  paymentProvider: z.enum(["MERCADO_PAGO", "ASAAS"]).optional(),
});

export async function GET() {
  const auth = await apiRequireAdmin();
  if ("error" in auth) return auth.error;

  const org = await prisma.organization.findUnique({
    where: { id: auth.ctx.organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logoUrl: true,
      accentColor: true,
      businessMode: true,
      onboardingCompletedAt: true,
      mercadoPagoAccessToken: true,
      asaasApiKey: true,
    },
  });
  if (!org) {
    return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
  }

  const page = await prisma.bookingPage.findFirst({
    where: { organizationId: org.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, slug: true, title: true },
  });

  return NextResponse.json({
    ...org,
    accentColor: normalizeAccent(org.accentColor),
    completed: Boolean(org.onboardingCompletedAt),
    bookingPageId: page?.id ?? null,
    bookingPageSlug: page?.slug ?? null,
    asaasEnabled: ASAAS_ENABLED,
    mercadoPagoConnected: Boolean(org.mercadoPagoAccessToken),
    asaasConnected: Boolean(org.asaasApiKey),
  });
}

export async function POST(req: Request) {
  const auth = await apiRequireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = schema.parse(await req.json());
    const orgId = auth.ctx.organizationId;

    if (body.businessMode === "SALON") {
      const names = (body.professionals || [])
        .map((p) => p.displayName.trim())
        .filter(Boolean);
      if (names.length < 1) {
        return NextResponse.json(
          { error: "No modo equipe, informe ao menos um profissional" },
          { status: 400 },
        );
      }
    }

    if (body.paymentProvider === "ASAAS" && !ASAAS_ENABLED) {
      return NextResponse.json(
        { error: "Asaas não está disponível neste ambiente" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.update({
        where: { id: orgId },
        data: {
          name: body.name.trim(),
          description: body.description.trim(),
          logoUrl: body.logoUrl || null,
          accentColor: normalizeAccent(body.accentColor || "#0a0a0a"),
          businessMode: body.businessMode,
          paymentProvider: body.paymentProvider || undefined,
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
          bookingPageId: page.id,
          bookings: { none: {} },
        },
      });

      const existingServices = await tx.service.findMany({
        where: { bookingPageId: page.id },
        select: { id: true },
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
              bookingPageId: page.id,
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

      if (body.applyBusinessHours !== false) {
        await tx.availabilityRule.deleteMany({
          where: { bookingPageId: page.id, professionalId: null },
        });
        await tx.availabilityRule.createMany({
          data: PRESET_WEEKDAYS.map((r) => ({
            bookingPageId: page.id,
            dayOfWeek: r.dayOfWeek,
            startTime: r.startTime,
            endTime: r.endTime,
          })),
        });
      }

      const serviceIds = createdServices.map((s) => s.id);
      const proIds: string[] = [];

      if (body.businessMode === "SALON") {
        const names = (body.professionals || [])
          .map((p) => p.displayName.trim())
          .filter(Boolean);

        const existingPros = await tx.professional.findMany({
          where: { organizationId: orgId },
          select: { id: true },
        });

        for (const [i, displayName] of names.entries()) {
          if (i < existingPros.length) {
            const pro = await tx.professional.update({
              where: { id: existingPros[i]!.id },
              data: { displayName, isActive: true, sortOrder: i },
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
                data: PRESET_WEEKDAYS.map((r) => ({
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

          const placeholderEmail = `pro-${org.slug}-${i + 1}-${Date.now().toString(36)}@book.local`;
          const passwordHash = await bcrypt.hash(
            `tmp-${Math.random().toString(36).slice(2, 10)}`,
            10,
          );

          const user = await tx.user.create({
            data: {
              email: placeholderEmail,
              name: displayName,
              passwordHash,
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
              data: PRESET_WEEKDAYS.map((r) => ({
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
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Revise os dados do assistente", details: e.flatten() },
        { status: 400 },
      );
    }
    console.error("[onboarding]", e);
    return NextResponse.json(
      { error: "Não foi possível concluir a configuração" },
      { status: 500 },
    );
  }
}

/** Pula o wizard: marca como concluído e deixa o usuário configurar na mão. */
export async function PATCH() {
  const auth = await apiRequireAdmin();
  if ("error" in auth) return auth.error;

  await prisma.organization.update({
    where: { id: auth.ctx.organizationId },
    data: { onboardingCompletedAt: new Date() },
  });

  return NextResponse.json({ ok: true, skipped: true });
}
