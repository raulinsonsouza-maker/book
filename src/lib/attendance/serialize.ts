import type { AttendanceCertificate } from "@prisma/client";
import { isoDateInTimezone, parseAttendanceHeader, type AttendanceHeader } from "./format";

export type AttendanceCertificateDTO = {
  id: string;
  patientName: string;
  visitDate: string;
  startTime: string;
  endTime: string;
  issueDate: string;
  issueCity: string;
  header: AttendanceHeader;
  createdAt: string;
};

export function serializeCertificate(c: AttendanceCertificate): AttendanceCertificateDTO {
  return {
    id: c.id,
    patientName: c.patientName,
    visitDate: c.visitDate,
    startTime: c.startTime,
    endTime: c.endTime,
    issueDate: isoDateInTimezone(c.issuedAt),
    issueCity: c.issueCity,
    header: parseAttendanceHeader(c.headerSnapshot),
    createdAt: c.createdAt.toISOString(),
  };
}
