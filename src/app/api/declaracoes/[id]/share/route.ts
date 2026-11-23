import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiRequireAttendance } from "@/lib/attendance/server";
import { serializeCertificate } from "@/lib/attendance/serialize";
import { newDocumentShareToken } from "@/lib/attendance/share";

/** Revoga ou regenera o link público do documento. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await apiRequireAttendance();
  if ("error" in access) return access.error;

  const { id } = await params;
  const existing = await prisma.attendanceCertificate.findFirst({
    where: { id, organizationId: access.ctx.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Declaração não encontrada" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const action =
    typeof (body as { action?: unknown }).action === "string"
      ? (body as { action: string }).action
      : "revoke";

  if (action === "regenerate") {
    const updated = await prisma.attendanceCertificate.update({
      where: { id: existing.id },
      data: {
        shareToken: newDocumentShareToken(),
        shareRevokedAt: null,
      },
    });
    return NextResponse.json({ item: serializeCertificate(updated) });
  }

  const updated = await prisma.attendanceCertificate.update({
    where: { id: existing.id },
    data: {
      shareRevokedAt: new Date(),
    },
  });
  return NextResponse.json({ item: serializeCertificate(updated) });
}
