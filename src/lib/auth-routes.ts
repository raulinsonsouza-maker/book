import type { AppRole } from "@/lib/rbac";
import { isTeamMemberRole } from "@/lib/rbac";

export type PostLoginUser = {
  mustChangePassword?: boolean | null;
  isPlatformAdmin?: boolean | null;
  role?: string | null;
  organizationId?: string | null;
};

/** Destino pós-login / pós-Google conforme o papel. */
export function postLoginPath(user: PostLoginUser | null | undefined): string {
  if (!user) return "/login";
  if (user.mustChangePassword) return "/primeiro-acesso";
  if (user.isPlatformAdmin) return "/admin";
  if (!user.organizationId) return "/signup/complete";
  if (isTeamMemberRole(user.role as AppRole | undefined)) return "/intake";
  return "/app";
}

export function isIntakePath(pathname: string) {
  return pathname === "/intake" || pathname.startsWith("/intake/");
}

export function isAppPath(pathname: string) {
  return pathname === "/app" || pathname.startsWith("/app/");
}

export function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}
