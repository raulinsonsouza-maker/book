import { NextResponse } from "next/server";
import { z } from "zod";
import { apiRequirePlatformAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { setOrgSubscriptionStatus } from "@/lib/billing/platform";

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

  const [services, bookings30d, professionals, plans] = await Promise.all([
    prisma.service.count({
      where: { bookingPage: { organizationId: id } },
    }),
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
  ]);

  return NextResponse.json({
    id: org.id,
    name: org.name,
    slug: org.slug,
    subscriptionStatus: org.subscriptionStatus,
    businessMode: org.businessMode,
    createdAt: org.createdAt,
    subscription: org.subscription,
    owners: org.memberships.map((m) => m.user),
    counts: { services, bookings30d, professionals },
    plans,
  });
}

const patchSchema = z.object({
  action: z.enum(["suspend", "activate", "trial", "set_plan"]),
  planId: z.string().optional(),
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
    } else if (body.action === "activate") {
      await setOrgSubscriptionStatus(id, "ACTIVE");
      await prisma.subscription.updateMany({
        where: { organizationId: id },
        data: { status: "ACTIVE", trialEndsAt: null },
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
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}
