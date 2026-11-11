export const BOOKING_STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Aguardando pagamento",
  CONFIRMED: "Confirmado",
  ARRIVED: "Paciente chegou",
  COMPLETED: "Atendido",
  NO_SHOW: "Paciente faltou",
  CANCELLED: "Cancelado",
  EXPIRED: "Expirado",
};

export type BookingCancelSource = "PATIENT" | "CLINIC";

export function bookingStatusLabel(
  status: string,
  cancelSource?: string | null,
) {
  if (status === "CANCELLED") {
    if (cancelSource === "PATIENT") return "Paciente cancelou";
    if (cancelSource === "CLINIC") return "Consultório cancelou";
  }
  return BOOKING_STATUS_LABEL[status] || status;
}

/** Status que ainda ocupam o horário na agenda. */
export const SLOT_OCCUPYING_STATUSES = [
  "CONFIRMED",
  "ARRIVED",
  "COMPLETED",
] as const;

/** Status visíveis no calendário da semana. */
export const CALENDAR_VISIBLE_STATUSES = [
  "CONFIRMED",
  "PENDING_PAYMENT",
  "ARRIVED",
  "COMPLETED",
  "NO_SHOW",
] as const;

/** Status “ativos” (ainda não finalizados/cancelados). */
export const ACTIVE_BOOKING_STATUSES = [
  "CONFIRMED",
  "PENDING_PAYMENT",
  "ARRIVED",
] as const;

export type StatusUpdateAction =
  | "ARRIVED"
  | "COMPLETED"
  | "NO_SHOW"
  | "CANCEL_PATIENT"
  | "CANCEL_CLINIC";

export function availableStatusActions(
  status: string,
): StatusUpdateAction[] {
  if (status === "CONFIRMED") {
    return ["ARRIVED", "COMPLETED", "NO_SHOW", "CANCEL_PATIENT", "CANCEL_CLINIC"];
  }
  if (status === "ARRIVED") {
    return ["COMPLETED", "NO_SHOW", "CANCEL_PATIENT", "CANCEL_CLINIC"];
  }
  if (status === "PENDING_PAYMENT") {
    return ["CANCEL_PATIENT", "CANCEL_CLINIC"];
  }
  return [];
}
