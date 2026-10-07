import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { apiRequireAdmin, getAuthContext, isFullAdminRole } from "@/lib/rbac";
import { parseAttendanceHeader, type AttendanceHeader } from "./format";

type AttendanceAccess =
  | { error: NextResponse }
  | {
      ctx: { organizationId: string; userId: string };
      header: AttendanceHeader;
    };

/** Admin da organização com o recurso de declarações ligado. */
export async function apiRequireAttendance(): Promise<AttendanceAccess> {
  const auth = await apiRequireAdmin();
  if (auth.error) return { error: auth.error };
  const org = await prisma.organization.findUnique({
    where: { id: auth.ctx.organizationId },
    select: { name: true, attendanceEnabled: true, attendanceConfig: true },
  });
  if (!org?.attendanceEnabled) {
    return {
      error: NextResponse.json(
        { error: "Recurso não disponível para esta conta" },
        { status: 403 },
      ),
    };
  }
  return {
    ctx: { organizationId: auth.ctx.organizationId, userId: auth.ctx.userId },
    header: parseAttendanceHeader(org.attendanceConfig, org.name),
  };
}

/** Páginas: só admin de conta com o recurso ligado; o resto volta ao painel. */
export async function requireAttendancePage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login?next=/app/declaracoes");
  if (!isFullAdminRole(ctx.role)) redirect("/app");
  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { name: true, attendanceEnabled: true, attendanceConfig: true },
  });
  if (!org?.attendanceEnabled) redirect("/app");
  return {
    organizationId: ctx.organizationId,
    header: parseAttendanceHeader(org.attendanceConfig, org.name),
  };
}
