import {
  formatShortDate,
  todayIsoDate,
} from "@/lib/attendance/format";

export const COMPARECIMENTO_KIND = "COMPARECIMENTO" as const;
export const ENCAMINHAMENTO_KIND = "ENCAMINHAMENTO" as const;
export const RECEITA_KIND = "RECEITA" as const;
export const ATESTADO_PADRAO_KIND = "ATESTADO_PADRAO" as const;
/** Atestado especial (template UPA / Letícia) — allowlist. */
export const ATESTADO_KIND = "ATESTADO" as const;

export type AttendanceKind =
  | typeof COMPARECIMENTO_KIND
  | typeof ENCAMINHAMENTO_KIND
  | typeof RECEITA_KIND
  | typeof ATESTADO_PADRAO_KIND
  | typeof ATESTADO_KIND;

export const HUB_KINDS: AttendanceKind[] = [
  COMPARECIMENTO_KIND,
  ENCAMINHAMENTO_KIND,
  RECEITA_KIND,
  ATESTADO_PADRAO_KIND,
];

export function parseAttendanceKind(
  raw: string | null | undefined,
): AttendanceKind | null {
  switch (raw) {
    case COMPARECIMENTO_KIND:
    case ENCAMINHAMENTO_KIND:
    case RECEITA_KIND:
    case ATESTADO_PADRAO_KIND:
    case ATESTADO_KIND:
      return raw;
    default:
      return null;
  }
}

/** Atestado especial (Letícia / UPA). */
export function isAtestadoEspecialKind(
  kind: string | null | undefined,
): boolean {
  return kind === ATESTADO_KIND;
}

/** @deprecated Use isAtestadoEspecialKind — mantido para imports existentes. */
export function isAtestadoKind(kind: string | null | undefined): boolean {
  return isAtestadoEspecialKind(kind);
}

export function isLetterheadKind(kind: string | null | undefined): boolean {
  return (
    kind === COMPARECIMENTO_KIND ||
    kind === ENCAMINHAMENTO_KIND ||
    kind === RECEITA_KIND ||
    kind === ATESTADO_PADRAO_KIND
  );
}

export function kindLabel(kind: string | null | undefined): string {
  switch (kind) {
    case COMPARECIMENTO_KIND:
      return "Comparecimento";
    case ENCAMINHAMENTO_KIND:
      return "Encaminhamento";
    case RECEITA_KIND:
      return "Receita";
    case ATESTADO_PADRAO_KIND:
      return "Atestado";
    case ATESTADO_KIND:
      return "Atestado especial";
    default:
      return "Documento";
  }
}

export function kindDocumentTitle(kind: string | null | undefined): string {
  switch (kind) {
    case COMPARECIMENTO_KIND:
      return "DECLARAÇÃO DE COMPARECIMENTO";
    case ENCAMINHAMENTO_KIND:
      return "ENCAMINHAMENTO";
    case RECEITA_KIND:
      return "RECEITA / ORIENTAÇÃO";
    case ATESTADO_PADRAO_KIND:
      return "ATESTADO";
    case ATESTADO_KIND:
      return "ATESTADO MÉDICO";
    default:
      return "DOCUMENTO";
  }
}

export function defaultEncaminhamentoBody(params?: {
  patientName?: string;
}) {
  const name = params?.patientName?.trim() || "_______________";
  return (
    `Encaminho o(a) paciente ${name} para avaliação especializada.\n\n` +
    `Motivo / indicação clínica:\n\n` +
    `Observações:`
  );
}

export function defaultReceitaBody() {
  return "1. _______________________________________________\n   Posologia: _________________________________________\n\n2. _______________________________________________\n   Posologia: _________________________________________";
}

export function defaultAtestadoPadraoBody(params?: {
  patientName?: string;
  visitDate?: string;
  cpf?: string | null;
}) {
  const name = params?.patientName?.trim() || "_______________";
  const cpf = params?.cpf?.trim() || "_______________";
  const date = params?.visitDate
    ? formatShortDate(params.visitDate)
    : formatShortDate(todayIsoDate());
  return (
    `Atesto para os devidos fins que o(a) paciente ${name}, CPF ${cpf}, ` +
    `esteve sob meus cuidados profissionais no dia ${date}, ` +
    `necessitando de afastamento de suas atividades por ___ dia(s), a partir desta data.\n\n` +
    `CID: _____`
  );
}
