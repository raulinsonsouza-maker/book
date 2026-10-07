export type AttendanceHeader = {
  businessName: string;
  address: string;
  phone: string;
  cnpj: string;
  city: string;
  signerName: string;
  signerTitle: string;
  signerPhone: string;
  logoUrl: string;
};

export type AttendanceDocumentData = {
  patientName: string;
  /** AAAA-MM-DD */
  visitDate: string;
  /** HH:mm */
  startTime: string;
  endTime: string;
  /** AAAA-MM-DD */
  issueDate: string;
  issueCity: string;
};

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export const ATTENDANCE_TIMEZONE = "America/Sao_Paulo";

export function emptyAttendanceHeader(orgName = ""): AttendanceHeader {
  return {
    businessName: orgName,
    address: "",
    phone: "",
    cnpj: "",
    city: "",
    signerName: "",
    signerTitle: "",
    signerPhone: "",
    logoUrl: "",
  };
}

export function parseAttendanceHeader(
  raw: string | null | undefined,
  orgName = "",
): AttendanceHeader {
  const base = emptyAttendanceHeader(orgName);
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw) as Partial<Record<keyof AttendanceHeader, unknown>>;
    for (const key of Object.keys(base) as (keyof AttendanceHeader)[]) {
      const v = parsed[key];
      if (typeof v === "string") base[key] = v;
    }
  } catch {
    // config inválida: cai no cabeçalho vazio
  }
  return base;
}

export function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m! - 1 && dt.getUTCDate() === d;
}

export function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** "2026-10-07" → "07 de outubro de 2026" */
export function formatLongDate(isoDate: string) {
  if (!isValidIsoDate(isoDate)) return isoDate;
  const [y, m, d] = isoDate.split("-");
  return `${d} de ${MONTHS[Number(m) - 1]} de ${y}`;
}

/** "2026-10-07" → "07/10/2026" */
export function formatShortDate(isoDate: string) {
  if (!isValidIsoDate(isoDate)) return isoDate;
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

/** "14:30" → "14h30" */
export function formatTime(time: string) {
  if (!isValidTime(time)) return time;
  const [h, m] = time.split(":");
  return `${h}h${m}`;
}

/** Data de hoje (AAAA-MM-DD) no fuso da clínica. */
export function todayIsoDate(now = new Date()) {
  return isoDateInTimezone(now);
}

export function isoDateInTimezone(date: Date, timeZone = ATTENDANCE_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Meio-dia em São Paulo, para a data não “virar” ao mudar de fuso. */
export function issueDateToDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00-03:00`);
}

export type TextRun = { text: string; bold?: boolean };

/** Parágrafos do corpo da declaração, com trechos em negrito. */
export function attendanceBody(
  header: AttendanceHeader,
  data: AttendanceDocumentData,
): TextRun[][] {
  const business = header.businessName.trim() || "nosso estabelecimento";
  return [
    [
      { text: "Declaramos, para os devidos fins e a pedido do(a) interessado(a), que " },
      { text: data.patientName.trim() || "[NOME COMPLETO]", bold: true },
      { text: " compareceu à " },
      { text: business, bold: true },
      { text: ", no dia " },
      { text: data.visitDate ? formatLongDate(data.visitDate) : "[DATA]", bold: true },
      { text: ", permanecendo no estabelecimento das " },
      {
        text: `${data.startTime ? formatTime(data.startTime) : "[ENTRADA]"} às ${
          data.endTime ? formatTime(data.endTime) : "[SAÍDA]"
        }`,
        bold: true,
      },
      { text: ", para atendimento previamente agendado." },
    ],
    [
      { text: "A presente declaração é emitida exclusivamente para fins de " },
      { text: "comprovação de comparecimento", bold: true },
      { text: "." },
    ],
  ];
}

export function attendanceIssueLine(data: AttendanceDocumentData) {
  const city = data.issueCity.trim();
  const date = formatLongDate(data.issueDate);
  return city ? `${city}, ${date}.` : `${date}.`;
}

/** Linha de contato do cabeçalho: telefone • CNPJ (se houver). */
export function attendanceContactLine(header: AttendanceHeader) {
  const parts: string[] = [];
  if (header.phone.trim()) parts.push(`Telefone / WhatsApp: ${header.phone.trim()}`);
  if (header.cnpj.trim()) parts.push(`CNPJ: ${header.cnpj.trim()}`);
  return parts.join("  •  ");
}

export function attendanceFileName(patientName: string, visitDate: string) {
  const slug = patientName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `declaracao-${slug || "paciente"}-${visitDate}.pdf`;
}
