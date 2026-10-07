import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiRequireAttendance } from "@/lib/attendance/server";
import type { AttendanceHeader } from "@/lib/attendance/format";

export async function GET() {
  const access = await apiRequireAttendance();
  if ("error" in access) return access.error;
  return NextResponse.json({ header: access.header });
}

const field = (max: number) => z.string().trim().max(max);

const headerSchema = z.object({
  businessName: field(120).min(2, "Informe o nome da clínica"),
  address: field(200),
  phone: field(40),
  cnpj: field(30),
  city: field(80),
  signerName: field(120),
  signerTitle: field(120),
  signerPhone: field(40),
  logoUrl: field(500),
});

export async function PATCH(req: Request) {
  const access = await apiRequireAttendance();
  if ("error" in access) return access.error;

  const body = await req.json().catch(() => null);
  const parsed = headerSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Dados inválidos" },
      { status: 400 },
    );
  }

  const header: AttendanceHeader = { ...access.header, ...parsed.data };
  await prisma.organization.update({
    where: { id: access.ctx.organizationId },
    data: { attendanceConfig: JSON.stringify(header) },
  });

  return NextResponse.json({ header });
}
