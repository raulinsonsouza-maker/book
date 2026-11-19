import type { AttendanceCertificate } from "@prisma/client";
import {
  COMPARECIMENTO_KIND,
  isAtestadoKind,
  type AttendanceKind,
} from "@/lib/attendance/atestado";
import {
  isoDateInTimezone,
  parseAttendanceHeader,
  type AttendanceHeader,
} from "./format";

export type AttendanceCertificateDTO = {
  id: string;
  kind: AttendanceKind;
  patientName: string;
  visitDate: string;
  startTime: string;
  endTime: string;
  issueDate: string;
  issueCity: string;
  title: string | null;
  bodyText: string | null;
  footerLeft: string | null;
  footerRight: string | null;
  header: AttendanceHeader;
  createdAt: string;
};

export function serializeCertificate(
  c: AttendanceCertificate,
): AttendanceCertificateDTO {
  const kind = isAtestadoKind(c.kind) ? "ATESTADO" : COMPARECIMENTO_KIND;
  return {
    id: c.id,
    kind,
    patientName: c.patientName,
    visitDate: c.visitDate,
    startTime: c.startTime,
    endTime: c.endTime,
    issueDate: isoDateInTimezone(c.issuedAt),
    issueCity: c.issueCity,
    title: c.title ?? null,
    bodyText: c.bodyText ?? null,
    footerLeft: c.footerLeft ?? null,
    footerRight: c.footerRight ?? null,
    header: parseAttendanceHeader(c.headerSnapshot),
    createdAt: c.createdAt.toISOString(),
  };
}
