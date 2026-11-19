import { formatShortDate, todayIsoDate } from "@/lib/attendance/format";

export const ATESTADO_KIND = "ATESTADO" as const;
export const COMPARECIMENTO_KIND = "COMPARECIMENTO" as const;

export type AttendanceKind =
  | typeof ATESTADO_KIND
  | typeof COMPARECIMENTO_KIND;

export const ATESTADO_DEFAULT_TITLE = "ATESTADO MÉDICO";

export const ATESTADO_HEADER_SRC = "/attendance/atestado-header.png";
export const ATESTADO_SIGNATURE_SRC = "/attendance/atestado-signature.png";

export function isAtestadoKind(kind: string | null | undefined): boolean {
  return kind === ATESTADO_KIND;
}

export function defaultAtestadoBody(params?: {
  patientName?: string;
  visitDate?: string;
}) {
  const name = params?.patientName?.trim() || "_______________";
  const date = params?.visitDate
    ? formatShortDate(params.visitDate)
    : formatShortDate(todayIsoDate());

  return (
    `Declaro para os devidos fins, a pedido do(a) ${name}, CPF: _______________ que o(a) mesmo(a) foi atendido(a) pelo serviço _______________, no dia ${date}, PORTADOR DA PATOLOGIA _______________, devendo permanecer afastado(a) de suas atividades laborativas por período de ___(___) dia(s), a partir desta data.\n\n` +
    `CID _____`
  );
}

export function atestadoIssueLine(params: {
  issueCity?: string;
  issueDate: string;
}) {
  const city = (params.issueCity || "Piracicaba-SP").trim();
  const date = formatLongDateTitleCase(params.issueDate);
  return `${city} ${date}`;
}

function formatLongDateTitleCase(isoDate: string) {
  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const [y, m, d] = isoDate.split("-");
  return `${Number(d)} de ${months[Number(m) - 1]} de ${y}`;
}

export function atestadoFileName(patientName: string, issueDate: string) {
  const slug = patientName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `atestado-${slug || "paciente"}-${issueDate}.pdf`;
}
