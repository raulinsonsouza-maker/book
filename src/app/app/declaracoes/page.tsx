import { prisma } from "@/lib/prisma";
import { requireAttendancePage } from "@/lib/attendance/server";
import { serializeCertificate } from "@/lib/attendance/serialize";
import { DeclaracoesView } from "./DeclaracoesView";

export default async function DeclaracoesPage() {
  const { organizationId, header } = await requireAttendancePage();
  const rows = await prisma.attendanceCertificate.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <DeclaracoesView
      initialHeader={header}
      initialItems={rows.map(serializeCertificate)}
    />
  );
}
