export type IntakeBoardStage =
  | "aguardando"
  | "liberado"
  | "andamento"
  | "concluido";

export type IntakeStageRow = {
  status: string;
  reviewStatus: string;
};

export const BOARD_STAGES: IntakeBoardStage[] = [
  "aguardando",
  "liberado",
  "andamento",
  "concluido",
];

export const stageMeta: Record<
  IntakeBoardStage,
  {
    label: string;
    shortLabel: string;
    hint: string;
    tone: string;
    column: string;
    dot: string;
    rank: number;
  }
> = {
  aguardando: {
    label: "Aguardando pagamento",
    shortLabel: "Aguardando",
    hint: "Cliente enviou o pedido; pagamento ainda não confirmado.",
    tone: "border-amber-200 bg-amber-50 text-amber-900",
    column: "border-amber-200/70 bg-amber-50/40",
    dot: "bg-amber-500",
    rank: 0,
  },
  liberado: {
    label: "Liberado",
    shortLabel: "Liberado",
    hint: "Pago — pronto para a equipe iniciar.",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
    column: "border-emerald-200/70 bg-emerald-50/40",
    dot: "bg-emerald-500",
    rank: 1,
  },
  andamento: {
    label: "Em andamento",
    shortLabel: "Andamento",
    hint: "Equipe trabalhando na abertura.",
    tone: "border-sky-200 bg-sky-50 text-sky-900",
    column: "border-sky-200/70 bg-sky-50/40",
    dot: "bg-sky-500",
    rank: 2,
  },
  concluido: {
    label: "Concluído",
    shortLabel: "Concluído",
    hint: "Abertura finalizada pela equipe.",
    tone: "border-slate-200 bg-slate-100 text-slate-700",
    column: "border-slate-200/80 bg-slate-50/60",
    dot: "bg-slate-500",
    rank: 3,
  },
};

/** Etapa do quadro (ignora rascunhos). */
export function boardStageOf(row: IntakeStageRow): IntakeBoardStage | null {
  if (row.reviewStatus === "COMPLETED") return "concluido";
  if (row.status === "PAID") {
    if (row.reviewStatus === "IN_REVIEW") return "andamento";
    return "liberado";
  }
  if (row.status === "SUBMITTED") return "aguardando";
  return null;
}

export type ReviewStatusPatch = "NEW" | "IN_REVIEW" | "COMPLETED";

/** reviewStatus alvo ao soltar o card numa coluna operacional. */
export function reviewStatusForTarget(
  target: IntakeBoardStage,
): ReviewStatusPatch | null {
  if (target === "liberado") return "NEW";
  if (target === "andamento") return "IN_REVIEW";
  if (target === "concluido") return "COMPLETED";
  return null;
}

/** Pode arrastar da coluna origem para a coluna destino? */
export function canDropOnStage(
  from: IntakeBoardStage,
  to: IntakeBoardStage,
): boolean {
  if (from === to) return false;
  if (from === "aguardando" || to === "aguardando") return false;
  return reviewStatusForTarget(to) !== null;
}

/** Próximo reviewStatus ao avançar no quadro (null = não move). */
export function forwardReviewStatus(
  stage: IntakeBoardStage,
): ReviewStatusPatch | null {
  if (stage === "liberado") return "IN_REVIEW";
  if (stage === "andamento") return "COMPLETED";
  return null;
}

/** reviewStatus ao voltar no quadro. */
export function backReviewStatus(
  stage: IntakeBoardStage,
): ReviewStatusPatch | null {
  if (stage === "andamento") return "NEW";
  if (stage === "concluido") return "IN_REVIEW";
  return null;
}

export function forwardLabel(stage: IntakeBoardStage): string | null {
  if (stage === "liberado") return "Iniciar";
  if (stage === "andamento") return "Concluir";
  return null;
}

export function backLabel(stage: IntakeBoardStage): string | null {
  if (stage === "andamento") return "Voltar";
  if (stage === "concluido") return "Reabrir";
  return null;
}
