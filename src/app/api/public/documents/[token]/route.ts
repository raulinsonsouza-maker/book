import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  kindLabel,
  parseAttendanceKind,
  COMPARECIMENTO_KIND,
} from "@/lib/attendance/kinds";
import { parseAttendanceHeader } from "@/lib/attendance/format";
import { isoDateInTimezone } from "@/lib/attendance/format";

export async function GET(
  _req: Request,
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

  const kind = parseAttendanceKind(row.kind) ?? COMPARECIMENTO_KIND;
  const header = parseAttendanceHeader(row.headerSnapshot);

  return NextResponse.json({
    document: {
      kind,
      kindLabel: kindLabel(kind),
      patientName: row.patientName,
      visitDate: row.visitDate,
      startTime: row.startTime,
      endTime: row.endTime,
      issueDate: isoDateInTimezone(row.issuedAt),
      issueCity: row.issueCity,
      title: row.title,
      bodyText: row.bodyText,
      footerLeft: row.footerLeft,
      footerRight: row.footerRight,
      signerName: row.signerName,
      signerSpecialty: row.signerSpecialty,
      signerCrm: row.signerCrm,
      header: {
        businessName: header.businessName,
        address: header.address,
        phone: header.phone,
        cnpj: header.cnpj,
        city: header.city,
        signerName: header.signerName,
        signerTitle: header.signerTitle,
        signerPhone: header.signerPhone,
        logoUrl: header.logoUrl,
      },
      pdfUrl: `/api/public/documents/${token}/pdf`,
    },
  });
}
