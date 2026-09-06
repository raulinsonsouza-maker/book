import { NextResponse } from "next/server";
import { z } from "zod";
import { apiRequirePlatformAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { setOrgSubscriptionStatus } from "@/lib/billing/platform";
import { getOrgWhatsAppUsage } from "@/lib/whatsapp/quota";
import { writePlatformAudit } from "@/lib/platform-audit";
import { slugify } from "@/lib/utils";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await apiRequirePlatformAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      subscription: { include: { plan: true } },
      memberships: {
        where: { role: "OWNER" },
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });
  if (!org) {
    return NextResponse.json({ error: "Não encontrada" }, { status: 404 });
  }

  const d30 = new Date();
  d30.setDate(d30.getDate() - 30);

  const [services, bookings30d, professionals, plans, waUsage] =
    await Promise.all([
      prisma.service.count({ where: { organizationId: id } }),
      prisma.booking.count({
        where: {
          bookingPage: { organizationId: id },
          createdAt: { gte: d30 },
        },
      }),
      prisma.professional.count({ where: { organizationId: id } }),
      prisma.plan.findMany({
        where: { isActive: true },
        orderBy: { priceCents: "asc" },
      }),
      getOrgWhatsAppUsage(id),
    ]);

  return NextResponse.json({
    id: org.id,
    name: org.name,
    slug: org.slug,
    subscriptionStatus: org.subscriptionStatus,
    businessMode: org.businessMode,
    whatsappEnabled: org.whatsappEnabled,
    internalNote: org.internalNote,
    notifyClientReminder: org.notifyClientReminder,
    createdAt: org.createdAt,
    subscription: org.subscription,
    owners: org.memberships.map((m) => m.user),
    counts: { services, bookings30d, professionals },
    plans,
    whatsappUsage: waUsage,
  });
}

const patchSchema = z.object({
  action: z
    .enum(["suspend", "activate", "trial", "set_plan", "update_profile"])
    .optional(),
  planId: z.string().optional(),
  name: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  internalNote: z.string().nullable().optional(),
  whatsappEnabled: z.boolean().optional(),
  notifyClientReminder: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await apiRequirePlatformAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  try {
    const body = patchSchema.parse(await req.json());

    if (body.action === "suspend") {
      await setOrgSubscriptionStatus(id, "SUSPENDED");
      await writePlatformAudit({
        actorUserId: auth.user.id,
        action: "org.suspend",
        targetType: "Organization",
        targetId: id,
      });
    } else if (body.action === "activate") {
      await setOrgSubscriptionStatus(id, "ACTIVE");
      await prisma.subscription.updateMany({
        where: { organizationId: id },
        data: { status: "ACTIVE", trialEndsAt: null },
      });
      await writePlatformAudit({
        actorUserId: auth.user.id,
        action: "org.activate",
        targetType: "Organization",
        targetId: id,
      });
    } else if (body.action === "trial") {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);
      await prisma.subscription.upsert({
        where: { organizationId: id },
        update: { status: "TRIALING", trialEndsAt },
        create: {
          organizationId: id,
          status: "TRIALING",
          trialEndsAt,
        },
      });
      await setOrgSubscriptionStatus(id, "TRIALING");
      await writePlatformAudit({
        actorUserId: auth.user.id,
        action: "org.trial",
        targetType: "Organization",
        targetId: id,
      });
    } else if (body.action === "set_plan" && body.planId) {
      await prisma.subscription.upsert({
        where: { organizationId: id },
        update: { planId: body.planId },
        create: {
          organizationId: id,
          planId: body.planId,
          status: "TRIALING",
        },
      });
      await writePlatformAudit({
        actorUserId: auth.user.id,
        action: "org.set_plan",
        targetType: "Organization",
        targetId: id,
        meta: { planId: body.planId },
      });
    }

    const profile: Record<string, unknown> = {};
    if (body.name !== undefined) profile.name = body.name;
    if (body.slug !== undefined) profile.slug = slugify(body.slug);
    if (body.internalNote !== undefined) profile.internalNote = body.internalNote;
    if (body.whatsappEnabled !== undefined)
      profile.whatsappEnabled = body.whatsappEnabled;
    if (body.notifyClientReminder !== undefined)
      profile.notifyClientReminder = body.notifyClientReminder;

    if (Object.keys(profile).length) {
      await prisma.organization.update({ where: { id }, data: profile });
      await writePlatformAudit({
        actorUserId: auth.user.id,
        action: "org.update_profile",
        targetType: "Organization",
        targetId: id,
        meta: profile,
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}
