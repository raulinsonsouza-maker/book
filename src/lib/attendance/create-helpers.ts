import { prisma } from "@/lib/prisma";
import {
  ATESTADO_DEFAULT_SIGNER_CRM,
  ATESTADO_DEFAULT_SIGNER_NAME,
  ATESTADO_DEFAULT_SIGNER_SPECIALTY,
  ATESTADO_DEFAULT_TITLE,
  ATESTADO_KIND,
  ATESTADO_PADRAO_KIND,
  COMPARECIMENTO_KIND,
  ENCAMINHAMENTO_KIND,
  RECEITA_KIND,
  type AttendanceKind,
} from "@/lib/attendance/atestado";
import type { AttendanceHeader } from "@/lib/attendance/format";
import { newDocumentShareToken } from "@/lib/attendance/share";

export async function resolveCustomerForOrg(
  organizationId: string,
  customerId: string | null | undefined,
) {
  if (!customerId) return null;
  return prisma.customer.findFirst({
    where: { id: customerId, organizationId },
    select: { id: true, name: true, cpf: true },
  });
}

export function buildCreateBase(params: {
  organizationId: string;
  userId: string;
  kind: AttendanceKind;
  patientName: string;
  customerId?: string | null;
  visitDate: string;
  startTime: string;
  endTime: string;
  issuedAt: Date;
  issueCity: string;
  headerSnapshot: string;
  title?: string | null;
  bodyText?: string | null;
  footerLeft?: string | null;
  footerRight?: string | null;
  signerName?: string | null;
  signerSpecialty?: string | null;
  signerCrm?: string | null;
}) {
  return {
    organizationId: params.organizationId,
    kind: params.kind,
    patientName: params.patientName.replace(/\s+/g, " "),
    customerId: params.customerId || null,
    visitDate: params.visitDate,
    startTime: params.startTime,
    endTime: params.endTime,
    issuedAt: params.issuedAt,
    issueCity: params.issueCity,
    title: params.title ?? null,
    bodyText: params.bodyText ?? null,
    footerLeft: params.footerLeft ?? null,
    footerRight: params.footerRight ?? null,
    signerName: params.signerName ?? null,
    signerSpecialty: params.signerSpecialty ?? null,
    signerCrm: params.signerCrm ?? null,
    headerSnapshot: params.headerSnapshot,
    shareToken: newDocumentShareToken(),
    shareRevokedAt: null,
    createdByUserId: params.userId,
  };
}

export function letterheadSnapshot(header: AttendanceHeader) {
  return JSON.stringify(header);
}

export function especialSnapshot() {
  return JSON.stringify({ kind: ATESTADO_KIND });
}

export function defaultTimesForTextDoc() {
  return { startTime: "00:00", endTime: "00:01" };
}

export {
  ATESTADO_DEFAULT_SIGNER_CRM,
  ATESTADO_DEFAULT_SIGNER_NAME,
  ATESTADO_DEFAULT_SIGNER_SPECIALTY,
  ATESTADO_DEFAULT_TITLE,
  ATESTADO_KIND,
  ATESTADO_PADRAO_KIND,
  COMPARECIMENTO_KIND,
  ENCAMINHAMENTO_KIND,
  RECEITA_KIND,
};
