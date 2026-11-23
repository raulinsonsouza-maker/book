import type { AttendanceCertificate } from "@prisma/client";
import {
  COMPARECIMENTO_KIND,
  parseAttendanceKind,
  type AttendanceKind,
} from "@/lib/attendance/kinds";
import {
  isoDateInTimezone,
  parseAttendanceHeader,
  type AttendanceHeader,
} from "./format";
import { documentPublicPath } from "./share";

export type AttendanceCertificateDTO = {
  id: string;
  kind: AttendanceKind;
  patientName: string;
  customerId: string | null;
  visitDate: string;
  startTime: string;
  endTime: string;
  issueDate: string;
  issueCity: string;
  title: string | null;
  bodyText: string | null;
  footerLeft: string | null;
  footerRight: string | null;
  signerName: string | null;
  signerSpecialty: string | null;
  signerCrm: string | null;
  header: AttendanceHeader;
  shareToken: string | null;
  shareUrl: string | null;
  shareRevoked: boolean;
  createdAt: string;
};

export function serializeCertificate(
  c: AttendanceCertificate,
): AttendanceCertificateDTO {
  const kind = parseAttendanceKind(c.kind) ?? COMPARECIMENTO_KIND;
  const revoked = Boolean(c.shareRevokedAt);
  const token = c.shareToken ?? null;
  return {
    id: c.id,
    kind,
    patientName: c.patientName,
    customerId: c.customerId ?? null,
    visitDate: c.visitDate,
    startTime: c.startTime,
    endTime: c.endTime,
    issueDate: isoDateInTimezone(c.issuedAt),
    issueCity: c.issueCity,
    title: c.title ?? null,
    bodyText: c.bodyText ?? null,
    footerLeft: c.footerLeft ?? null,
    footerRight: c.footerRight ?? null,
    signerName: c.signerName ?? null,
    signerSpecialty: c.signerSpecialty ?? null,
    signerCrm: c.signerCrm ?? null,
    header: parseAttendanceHeader(c.headerSnapshot),
    shareToken: token,
    shareUrl: token && !revoked ? documentPublicPath(token) : null,
    shareRevoked: revoked,
    createdAt: c.createdAt.toISOString(),
  };
}
