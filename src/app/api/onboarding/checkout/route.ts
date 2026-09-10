import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { DESCRIPTION_MAX } from "@/lib/branding";
import {
  isPlatformBillingEnabled,
  platformMercadoPagoConfigured,
} from "@/lib/billing/platform";
import {
  isPlatformPlanSlug,
} from "@/lib/billing/plans-catalog";
import { platformMpPublicKey } from "@/lib/billing/mercadopago-platform";
import { ensurePlatformCheckoutPlans } from "@/lib/billing/ensure-plans";
import { provisionOrganization } from "@/lib/onboarding";
import { applyOnboardingSetup } from "@/lib/onboarding/apply-setup";
import { inviteOnboardingProfessionals } from "@/lib/onboarding/invite-professionals";
import { toE164 } from "@/lib/whatsapp/phone";

const serviceSchema = z.object({
  title: z.string().trim().min(2).max(80),
  durationMinutes: z.coerce.number().int().min(5).max(480),
  priceCents: z.coerce.number().int().min(0),
});

const schema = z.object({
  accountName: z.string().trim().min(2).max(80),
  email: z.string().email(),
  phone: z.string().trim().min(8).max(20),
  password: z.string().min(6).max(100),
  planSlug: z.string().refine(isPlatformPlanSlug, "Plano inválido"),
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
});

function resolveDescription(description: string, businessName: string) {
  const trimmed = description.trim();
  if (trimmed.length >= 2) return trimmed.slice(0, DESCRIPTION_MAX);
  return `Agendamentos em ${businessName.trim() || "seu negócio"}`.slice(
    0,
    DESCRIPTION_MAX,
  );
}

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const email = body.email.toLowerCase().trim();
    const phone = toE164(body.phone);
    if (!phone) {
      return NextResponse.json(
        { error: "Informe um WhatsApp válido com DDD" },
        { status: 400 },
      );
    }
    const description = resolveDescription(body.description || "", body.name);

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
      if (entries.some((p) => p.phone === phone)) {
        return NextResponse.json(
          {
            error:
              "WhatsApp do profissional não pode ser o mesmo da conta",
          },
          { status: 400 },
        );
      }
      if (entries.some((p) => p.email === email)) {
        return NextResponse.json(
          { error: "E-mail do profissional não pode ser o mesmo da conta" },
          { status: 400 },
        );
      }
      const emails = entries.map((p) => p.email);
      if (new Set(emails).size !== emails.length) {
        return NextResponse.json(
          { error: "Os e-mails dos profissionais precisam ser diferentes" },
          { status: 400 },
        );
      }
      const phones = entries.map((p) => p.phone!);
      if (new Set(phones).size !== phones.length) {
        return NextResponse.json(
          { error: "Os WhatsApp dos profissionais precisam ser diferentes" },
          { status: 400 },
        );
      }
      for (const entry of entries) {
        const taken = await prisma.user.findUnique({
          where: { email: entry.email },
        });
        if (taken) {
          return NextResponse.json(
            { error: `E-mail já cadastrado: ${entry.email}` },
            { status: 400 },
          );
        }
      }
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json(
        { error: "E-mail já cadastrado" },
        { status: 400 },
      );
    }

    let plan = await prisma.plan.findFirst({
      where: { slug: body.planSlug, isActive: true },
    });
    if (!plan) {
      await ensurePlatformCheckoutPlans();
      plan = await prisma.plan.findFirst({
        where: { slug: body.planSlug, isActive: true },
      });
    }
    if (!plan) {
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        name: body.accountName.trim(),
        email,
        phone,
        passwordHash,
      },
    });

    const provisioned = await provisionOrganization(user.id, body.name.trim());
    const orgId = provisioned.organizationId;

    const setup = await prisma.$transaction((tx) =>
      applyOnboardingSetup(
        orgId,
        {
          name: body.name,
          description,
          logoUrl: body.logoUrl,
          accentColor: body.accentColor,
          businessMode: body.businessMode,
          professionals: body.professionals?.map((p) => ({
            displayName: p.displayName,
            email: p.email.toLowerCase().trim(),
            phone: p.phone,
          })),
          services: body.services,
          availabilityRules: body.availabilityRules,
          applyBusinessHours: true,
        },
        tx,
      ),
    );

    const billingEnabled = await isPlatformBillingEnabled();
    const mpReady = await platformMercadoPagoConfigured();

    // Billing desligado: libera acesso sem cobrar (só para dev local).
    if (!billingEnabled) {
      await prisma.subscription.upsert({
        where: { organizationId: orgId },
        update: {
          planId: plan.id,
          status: "ACTIVE",
          trialEndsAt: null,
          currentPeriodEnd:
            plan.interval === "SEMESTER"
              ? new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        create: {
          organizationId: orgId,
          planId: plan.id,
          status: "ACTIVE",
          currentPeriodEnd:
            plan.interval === "SEMESTER"
              ? new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      await prisma.organization.update({
        where: { id: orgId },
        data: { subscriptionStatus: "ACTIVE" },
      });

      await inviteOnboardingProfessionals(orgId).catch((err) =>
        console.error("[onboarding/checkout] invite", err),
      );

      return NextResponse.json({
        ok: true,
        email,
        organizationSlug: setup.organizationSlug,
        bookingPageSlug: setup.bookingPageSlug,
        billingSkipped: true,
        redirectTo: "/app",
      });
    }

    if (!mpReady) {
      return NextResponse.json(
        {
          error:
            "Pagamento obrigatório, mas o Mercado Pago da plataforma não está configurado. Conecte em Admin → Configuração.",
        },
        { status: 503 },
      );
    }

    await prisma.subscription.upsert({
      where: { organizationId: orgId },
      update: {
        planId: plan.id,
        status: "PAST_DUE",
        trialEndsAt: null,
      },
      create: {
        organizationId: orgId,
        planId: plan.id,
        status: "PAST_DUE",
      },
    });
    await prisma.organization.update({
      where: { id: orgId },
      data: { subscriptionStatus: "PAST_DUE" },
    });

    return NextResponse.json({
      ok: true,
      email,
      organizationSlug: setup.organizationSlug,
      bookingPageSlug: setup.bookingPageSlug,
      billingSkipped: false,
      redirectTo: "/onboarding/pagamento",
      publicKey: await platformMpPublicKey(),
      plan: {
        name: plan.name,
        slug: plan.slug,
        priceCents: plan.priceCents,
        interval: plan.interval,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.issues[0]?.message || "Dados inválidos" },
        { status: 400 },
      );
    }
    console.error("[onboarding/checkout]", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Não foi possível criar a conta e o checkout",
      },
      { status: 500 },
    );
  }
}
