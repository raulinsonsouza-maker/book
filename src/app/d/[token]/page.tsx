import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  COMPARECIMENTO_KIND,
  kindLabel,
  parseAttendanceKind,
} from "@/lib/attendance/kinds";
import { serializeCertificate } from "@/lib/attendance/serialize";
import { PublicDocumentView } from "./PublicDocumentView";

export const metadata: Metadata = {
  title: "Documento",
  robots: { index: false, follow: false },
};

export default async function PublicDocumentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token || token.length < 16) notFound();

  const row = await prisma.attendanceCertificate.findFirst({
    where: { shareToken: token },
  });
  if (!row || row.shareRevokedAt) notFound();

  const cert = serializeCertificate(row);
  const kind = parseAttendanceKind(row.kind) ?? COMPARECIMENTO_KIND;

  return (
    <PublicDocumentView
      token={token}
      kindLabel={kindLabel(kind)}
      clinicName={cert.header.businessName || "Clínica"}
      logoUrl={cert.header.logoUrl || null}
      document={cert}
    />
  );
}
