import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAttendancePage } from "@/lib/attendance/server";
import { serializeCertificate } from "@/lib/attendance/serialize";
import { PrintView } from "./PrintView";

type Props = { params: Promise<{ id: string }> };

export default async function ImprimirDeclaracaoPage({ params }: Props) {
  const { organizationId } = await requireAttendancePage();
  const { id } = await params;
  const row = await prisma.attendanceCertificate.findFirst({
    where: { id, organizationId },
  });
  if (!row) notFound();

  return <PrintView certificate={serializeCertificate(row)} />;
}
