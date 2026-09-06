import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiRequireAdmin } from "@/lib/rbac";
import { DESCRIPTION_MAX, normalizeAccent } from "@/lib/branding";
import { ASAAS_ENABLED } from "@/lib/feature-flags";
import { toE164 } from "@/lib/whatsapp/phone";

const PRESET_WEEKDAYS = [1, 2, 3, 4, 5].flatMap((dayOfWeek) => [
  { dayOfWeek, startTime: "09:00", endTime: "12:00" },
  { dayOfWeek, startTime: "13:00", endTime: "18:00" },
]);

const serviceSchema = z.object({
  title: z.string().trim().min(2).max(80),
  durationMinutes: z.coerce.number().int().min(5).max(480),
  priceCents: z.coerce.number().int().min(0),
});

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(DESCRIPTION_MAX).optional().default(""),
  logoUrl: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (v == null) return null;
      const s = v.trim();
      return s || null;
    }),
  accentColor: z.string().optional(),
  businessMode: z.enum(["SOLO", "SALON"]),
  professionals: z
    .array(
      z.object({
        displayName: z.string().trim().min(2).max(80),
        email: z.string().trim().email(),
        phone: z.string().trim().min(8).max(20),
      }),
    )
    .max(20)
    .optional(),
  services: z.array(serviceSchema).min(1).max(30),
  applyBusinessHours: z.boolean().optional().default(true),
  availabilityRules: z
    .array(
      z.object({
        dayOfWeek: z.coerce.number().int().min(0).max(6),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
      }),
    )
    .max(28)
    .optional(),
  paymentProvider: z
    .enum(["MERCADO_PAGO", "ASAAS"])
    .nullable()
    .optional()
    .transform((v) => v ?? undefined),
});

function resolveDescription(description: string, businessName: string) {
  const trimmed = description.trim();
  if (trimmed.length >= 2) return trimmed.slice(0, DESCRIPTION_MAX);
  return `Agendamentos em ${businessName.trim() || "seu negócio"}`.slice(
    0,
    DESCRIPTION_MAX,
  );
}

function zodUserMessage(err: z.ZodError) {
  const issue = err.issues[0];
  if (!issue) return "Revise os dados do assistente";
  const path = issue.path.join(".");
  if (path.startsWith("name")) return "Informe o nome da empresa (mín. 2 caracteres)";
  if (path.startsWith("description")) {
    if (issue.code === "too_big") {
      return `A descrição pode ter no máximo ${DESCRIPTION_MAX} caracteres`;
    }
    return "Revise a descrição";
  }
  if (path.includes("phone") && path.startsWith("professionals")) {
    return "Informe um WhatsApp válido com DDD para cada profissional";
  }
  if (path.includes("email") && path.startsWith("professionals")) {
    return "Informe um e-mail válido para cada profissional";
  }
  if (path.includes("displayName") || path.startsWith("professionals")) {
    return "Nome do profissional inválido (mín. 2 caracteres)";
  }
  if (path.includes("title") || path.startsWith("services")) {
    if (path.includes("duration")) return "Duração do serviço inválida (5–480 min)";
    if (path.includes("price")) return "Preço do serviço inválido";
    return "Revise os serviços (título com mín. 2 caracteres)";
  }
  if (path.startsWith("paymentProvider")) return "Escolha de pagamento inválida";
  if (path.startsWith("availabilityRules")) return "Revise os horários de atendimento";
  if (path.startsWith("logoUrl")) return "Logo inválida — tente outra imagem";
  return "Revise os dados do assistente";
}

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
      const entries = (body.professionals || [])
        .map((p) => ({
          displayName: p.displayName.trim(),
          email: p.email.trim().toLowerCase(),
          phone: toE164(p.phone),
        }))
        .filter((p) => p.displayName.length >= 2 && p.email.includes("@"));
      if (entries.length < 1) {
        return NextResponse.json(
          {
            error:
              "No modo equipe, informe ao menos um profissional com e-mail e WhatsApp",
          },
          { status: 400 },
        );
      }
      if (entries.some((p) => !p.phone)) {
        return NextResponse.json(
          { error: "Informe um WhatsApp válido com DDD para cada profissional" },
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

    const description = resolveDescription(body.description || "", body.name);

    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.update({
        where: { id: orgId },
        data: {
          name: body.name.trim(),
          description,
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
            phone: toE164(p.phone) || null,
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
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof z.ZodError) {
      console.warn("[onboarding] validation", e.flatten());
      return NextResponse.json(
        {
          error: zodUserMessage(e),
          details: e.flatten(),
        },
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
