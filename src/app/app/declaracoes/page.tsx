import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { requireAttendancePage } from "@/lib/attendance/server";
import { serializeCertificate } from "@/lib/attendance/serialize";
import { orgCanIssueAtestado } from "@/lib/attendance/atestado-access";
import { getAuthContext } from "@/lib/rbac";
import { resolveBusinessProfile } from "@/lib/business-profile";
import { DeclaracoesView } from "./DeclaracoesView";

export default async function DeclaracoesPage() {
  const { organizationId, header } = await requireAttendancePage();
  const ctx = await getAuthContext();
  const [rows, atestadoEnabled, org] = await Promise.all([
    prisma.attendanceCertificate.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    orgCanIssueAtestado(organizationId),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        businessProfile: true,
        featureFlags: true,
        attendanceEnabled: true,
      },
    }),
  ]);

  const profile = resolveBusinessProfile(
    org?.businessProfile,
    org?.featureFlags,
    org?.attendanceEnabled,
  );

  return (
    <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
      <DeclaracoesView
        initialHeader={header}
        initialItems={rows.map(serializeCertificate)}
        currentUserName={ctx?.name || ""}
        atestadoEnabled={atestadoEnabled}
        prescriptionsEnabled={profile.features.prescriptions}
      />
    </Suspense>
  );
}
