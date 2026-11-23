import {
  ATTENDANCE_TIMEZONE,
  formatShortDate,
  todayIsoDate,
} from "@/lib/attendance/format";
import {
  ATESTADO_KIND,
  COMPARECIMENTO_KIND,
  isAtestadoEspecialKind,
  type AttendanceKind,
} from "@/lib/attendance/kinds";

export {
  ATESTADO_KIND,
  ATESTADO_PADRAO_KIND,
  COMPARECIMENTO_KIND,
  ENCAMINHAMENTO_KIND,
  RECEITA_KIND,
  HUB_KINDS,
  defaultAtestadoPadraoBody,
  defaultEncaminhamentoBody,
  defaultReceitaBody,
  isAtestadoEspecialKind,
  isAtestadoKind,
  isLetterheadKind,
  kindDocumentTitle,
  kindLabel,
  parseAttendanceKind,
  type AttendanceKind,
} from "@/lib/attendance/kinds";

export const ATESTADO_DEFAULT_TITLE = "ATESTADO MÉDICO";

export const ATESTADO_HEADER_SRC = "/attendance/atestado-header.png";

export const ATESTADO_FOOTER_REPORT =
  "Relatorio Atestado Mediico Paciente.rpt";

export const ATESTADO_DEFAULT_SIGNER_NAME = "Dr. Rodrigo Bravo";
export const ATESTADO_DEFAULT_SIGNER_SPECIALTY = "Clínico Geral";
export const ATESTADO_DEFAULT_SIGNER_CRM = "SP 965685";
export const ATESTADO_SIGN_LABEL = "Assinatura do Profissional";

/** HH:mm:ss no fuso da clínica. */
export function nowTimeHms(now = new Date(), timeZone = ATTENDANCE_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("hour")}:${get("minute")}:${get("second")}`;
}

/** Pré-preenche o rodapé esquerdo com data + intervalo de horário. */
export function defaultAtestadoFooterLeft(params?: {
  issueDate?: string;
  startHms?: string;
  endHms?: string;
}) {
  const date = params?.issueDate
    ? formatShortDate(params.issueDate)
    : formatShortDate(todayIsoDate());
  const start = params?.startHms || nowTimeHms();
  const end = params?.endHms || start;
  return `${ATESTADO_FOOTER_REPORT} ${date} ${start} às ${end}`;
}

export function defaultAtestadoFooterRight(userName?: string) {
  const name = (userName || "").trim().toUpperCase() || "_______________";
  return `Usuario: ${name}`;
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

export function documentFileName(
  kind: AttendanceKind | string,
  patientName: string,
  issueDate: string,
) {
  const prefix = isAtestadoEspecialKind(kind)
    ? "atestado"
    : kind === COMPARECIMENTO_KIND
      ? "comparecimento"
      : kind === "ENCAMINHAMENTO"
        ? "encaminhamento"
        : kind === "RECEITA"
          ? "receita"
          : kind === "ATESTADO_PADRAO"
            ? "atestado"
            : "documento";
  const slug = patientName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${prefix}-${slug || "paciente"}-${issueDate}.pdf`;
}

export { ATESTADO_KIND as ATESTADO_ESPECIAL_KIND };
