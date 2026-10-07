import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiRequireAttendance } from "@/lib/attendance/server";
import { attendanceFileName } from "@/lib/attendance/format";
import { buildAttendancePdf } from "@/lib/attendance/pdf";
import { serializeCertificate } from "@/lib/attendance/serialize";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await apiRequireAttendance();
  if ("error" in access) return access.error;

  const { id } = await params;
  const row = await prisma.attendanceCertificate.findFirst({
    where: { id, organizationId: access.ctx.organizationId },
  });
  if (!row) {
    return NextResponse.json({ error: "Declaração não encontrada" }, { status: 404 });
  }

  const cert = serializeCertificate(row);
  const bytes = await buildAttendancePdf(cert.header, cert);
  const fileName = attendanceFileName(cert.patientName, cert.visitDate);
  const inline = new URL(req.url).searchParams.get("inline") === "1";

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
