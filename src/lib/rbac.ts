import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AppRole = "OWNER" | "ADMIN" | "MEMBER" | "PROFESSIONAL";

export function isAdminRole(role: string | undefined | null) {
  return role === "OWNER" || role === "ADMIN" || role === "MEMBER";
}

export function isProfessionalRole(role: string | undefined | null) {
  return role === "PROFESSIONAL";
}

export async function getAuthContext() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    include: {
      professional: { select: { id: true, isActive: true, displayName: true } },
      organization: {
        select: { id: true, businessMode: true, name: true, slug: true, timezone: true },
      },
    },
  });

  if (!membership) return null;

  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    organizationId: membership.organizationId,
    role: membership.role as AppRole,
    professionalId: membership.professional?.id ?? null,
    professionalActive: membership.professional?.isActive ?? false,
    businessMode: membership.organization.businessMode as "SOLO" | "SALON",
    organization: membership.organization,
  };
}

export async function requireAuthContext() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  return ctx;
}

export async function requireAdminContext() {
  const ctx = await requireAuthContext();
  if (!isAdminRole(ctx.role)) redirect("/app");
  return ctx;
}

/** API helper: 401/403 JSON */
export async function apiAuthContext() {
  const ctx = await getAuthContext();
  if (!ctx) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ctx };
}

export async function apiRequireAdmin() {
  const result = await apiAuthContext();
  if ("error" in result) return result;
  if (!isAdminRole(result.ctx.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return result;
}

export async function apiRequireAdminOrPro() {
  return apiAuthContext();
}

/** Booking list filter for the current user */
export function bookingScopeWhere(ctx: {
  organizationId: string;
  role: AppRole;
  professionalId: string | null;
}) {
  const base = { bookingPage: { organizationId: ctx.organizationId } };
  if (isProfessionalRole(ctx.role) && ctx.professionalId) {
    return { ...base, professionalId: ctx.professionalId };
  }
  return base;
}
