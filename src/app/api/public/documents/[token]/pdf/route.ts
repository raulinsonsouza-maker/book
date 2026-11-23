import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildCertificatePdf } from "@/lib/attendance/pdf";
import { serializeCertificate } from "@/lib/attendance/serialize";
import { documentFileName } from "@/lib/attendance/atestado";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || token.length < 16) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  }

  const row = await prisma.attendanceCertificate.findFirst({
    where: { shareToken: token },
  });
  if (!row || row.shareRevokedAt) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  }

  const cert = serializeCertificate(row);
  const bytes = await buildCertificatePdf({
    kind: cert.kind,
    header: cert.header,
    data: cert,
  });
  const fileName = documentFileName(cert.kind, cert.patientName, cert.issueDate);
  const inline = new URL(req.url).searchParams.get("inline") !== "0";

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
