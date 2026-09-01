import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AppRole = "OWNER" | "ADMIN" | "MEMBER" | "PROFESSIONAL";

/** OWNER ou ADMIN — acesso administrativo completo da org */
export function isFullAdminRole(role: string | undefined | null) {
  return role === "OWNER" || role === "ADMIN";
}

/** @deprecated Use isFullAdminRole — MEMBER não é mais admin completo */
export function isAdminRole(role: string | undefined | null) {
  return isFullAdminRole(role);
}

export function isTeamMemberRole(role: string | undefined | null) {
  return role === "MEMBER";
}

export function canAccessIntake(role: string | undefined | null) {
  return isFullAdminRole(role) || isTeamMemberRole(role);
}

export function isProfessionalRole(role: string | undefined | null) {
  return role === "PROFESSIONAL";
}

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      isPlatformAdmin: true,
      disabledAt: true,
    },
  });
  if (!user || user.disabledAt) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isPlatformAdmin: user.isPlatformAdmin,
  };
}

export async function requirePlatformAdmin() {
  const user = await getSessionUser();
  if (!user?.isPlatformAdmin) redirect("/login");
  return user;
}

export async function apiRequirePlatformAdmin() {
  const user = await getSessionUser();
  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Faça login para continuar" },
        { status: 401 },
      ),
    };
  }
  if (!user.isPlatformAdmin) {
    return {
      error: NextResponse.json({ error: "Acesso restrito" }, { status: 403 }),
    };
  }
  return { user };
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

export async function requireFullAdminContext() {
  const ctx = await requireAuthContext();
  if (!isFullAdminRole(ctx.role)) redirect("/app/intake");
  return ctx;
}

export async function requireIntakeContext() {
  const ctx = await requireAuthContext();
  if (!canAccessIntake(ctx.role)) redirect("/app");
  return ctx;
}

/** @deprecated Use requireFullAdminContext */
export async function requireAdminContext() {
  return requireFullAdminContext();
}

/** API helper: 401/403 JSON */
export async function apiAuthContext() {
  const ctx = await getAuthContext();
  if (!ctx) {
    return {
      error: NextResponse.json(
        { error: "Faça login para continuar" },
        { status: 401 },
      ),
    };
  }
  return { ctx };
}

export async function apiRequireFullAdmin() {
  const result = await apiAuthContext();
  if ("error" in result) return result;
  if (!isFullAdminRole(result.ctx.role)) {
    return {
      error: NextResponse.json(
        { error: "Sem permissão para esta ação" },
        { status: 403 },
      ),
    };
  }
  return result;
}

/** @deprecated Use apiRequireFullAdmin */
export async function apiRequireAdmin() {
  return apiRequireFullAdmin();
}

export async function apiRequireIntake() {
  const result = await apiAuthContext();
  if ("error" in result) return result;
  if (!canAccessIntake(result.ctx.role)) {
    return {
      error: NextResponse.json(
        { error: "Sem permissão para esta ação" },
        { status: 403 },
      ),
    };
  }
  return result;
}

export async function apiRequireStaff() {
  const result = await apiAuthContext();
  if ("error" in result) return result;
  if (isTeamMemberRole(result.ctx.role)) {
    return {
      error: NextResponse.json(
        { error: "Sem permissão para esta ação" },
        { status: 403 },
      ),
    };
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

/** Profissional logado só enxerga a própria agenda; admin pode filtrar por query. */
export function resolveProfessionalScope(
  ctx: { role: AppRole; professionalId: string | null },
  requestedProfessionalId?: string | null,
): string | null {
  if (isProfessionalRole(ctx.role) && ctx.professionalId) {
    return ctx.professionalId;
  }
  return requestedProfessionalId ?? null;
}
