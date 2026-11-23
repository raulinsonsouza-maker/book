import { prisma } from "@/lib/prisma";
import { requireAttendancePage } from "@/lib/attendance/server";
import { serializeCertificate } from "@/lib/attendance/serialize";
import { orgCanIssueAtestado } from "@/lib/attendance/atestado-access";
import { getAuthContext } from "@/lib/rbac";
import { DeclaracoesView } from "./DeclaracoesView";

export default async function DeclaracoesPage() {
  const { organizationId, header } = await requireAttendancePage();
  const ctx = await getAuthContext();
  const [rows, atestadoEnabled] = await Promise.all([
    prisma.attendanceCertificate.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    orgCanIssueAtestado(organizationId),
  ]);

  return (
    <DeclaracoesView
      initialHeader={header}
      initialItems={rows.map(serializeCertificate)}
      currentUserName={ctx?.name || ""}
      atestadoEnabled={atestadoEnabled}
    />
  );
}
