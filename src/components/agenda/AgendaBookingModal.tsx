"use client";

import { useEffect, useId, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  availableStatusActions,
  bookingStatusLabel,
  type StatusUpdateAction,
} from "@/lib/booking-status";

export type AgendaBookingDetails = {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  timezone?: string;
  customerId?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  serviceTitle: string;
  serviceImageUrl?: string | null;
  serviceDurationMinutes?: number | null;
  professionalName?: string | null;
  professionalPhotoUrl?: string | null;
  pageTitle?: string | null;
  confirmedAt?: string | null;
  arrivedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancelSource?: string | null;
  createdAt?: string | null;
  googleEventId?: string | null;
  googleMeetLink?: string | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  paymentAmountCents?: number | null;
};

const PAYMENT_LABEL: Record<string, string> = {
  PAID: "Pago",
  PENDING: "Pendente",
  FAILED: "Falhou",
  REFUNDED: "Estornado",
};

const STATUS_ACTIONS: {
  id: StatusUpdateAction;
  label: string;
  tone: "arrive" | "done" | "miss" | "cancel";
  group: "primary" | "negative";
}[] = [
  {
    id: "ARRIVED",
    label: "Paciente chegou",
    tone: "arrive",
    group: "primary",
  },
  {
    id: "COMPLETED",
    label: "Paciente atendido",
    tone: "done",
    group: "primary",
  },
  {
    id: "NO_SHOW",
    label: "Paciente faltou",
    tone: "miss",
    group: "negative",
  },
  {
    id: "CANCEL_PATIENT",
    label: "Paciente cancelou",
    tone: "cancel",
    group: "negative",
  },
  {
    id: "CANCEL_CLINIC",
    label: "Consultório cancelou",
    tone: "cancel",
    group: "negative",
  },
];

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function shortWhen(iso?: string | null) {
  if (!iso) return null;
  try {
    return format(parseISO(iso), "dd/MMM 'às' HH:mm", { locale: ptBR });
  } catch {
    return null;
  }
}

function DetailThumb({
  src,
  alt,
  fallback,
  rounded = "lg",
}: {
  src?: string | null;
  alt: string;
  fallback: string;
  rounded?: "lg" | "full";
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={`agenda-detail-thumb ${
          rounded === "full" ? "is-round" : "is-square"
        }`}
      />
    );
  }
  return (
    <span
      className={`agenda-detail-thumb agenda-detail-thumb-fallback ${
        rounded === "full" ? "is-round" : "is-square"
      }`}
      aria-hidden
    >
      {fallback}
    </span>
  );
}

function StatusGlyph({ tone }: { tone: string }) {
  return (
    <span className={`agenda-status-glyph is-${tone}`} aria-hidden>
      {tone === "arrive" ? (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
          <path
            d="M5 20V10.5L12 5l7 5.5V20H5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M9.5 20v-5h5v5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      ) : tone === "done" ? (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M8.5 12.2 11 14.7 15.5 9.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : tone === "miss" ? (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
          <rect
            x="5"
            y="6"
            width="14"
            height="13"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M8 4.5h8M9.5 11.5l5 5M14.5 11.5l-5 5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M9 9l6 6M15 9l-6 6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )}
    </span>
  );
}

export function AgendaBookingModal({
  booking: initial,
  onClose,
  onChanged,
}: {
  booking: AgendaBookingDetails;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const titleId = useId();
  const [booking, setBooking] = useState(initial);
  const [busyAction, setBusyAction] = useState<StatusUpdateAction | null>(null);
  const [error, setError] = useState("");
  const [chartBusy, setChartBusy] = useState(false);

  useEffect(() => {
    setBooking(initial);
  }, [initial]);

  async function openChart() {
    setError("");
    if (booking.customerId) {
      window.location.href = `/app/clientes/${booking.customerId}`;
      return;
    }
    setChartBusy(true);
    try {
      const res = await fetch("/api/clients/ensure-from-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.customerId) {
        setError(data.error || "Não foi possível abrir o prontuário");
        return;
      }
      setBooking((prev) => ({ ...prev, customerId: data.customerId }));
      window.location.href = `/app/clientes/${data.customerId}`;
    } catch {
      setError("Falha de conexão ao abrir prontuário");
    } finally {
      setChartBusy(false);
    }
  }

  const start = parseISO(booking.startAt);
  const end = parseISO(booking.endAt);
  const confirmed =
    booking.status === "CONFIRMED" || booking.status === "ARRIVED";
  const pending = booking.status === "PENDING_PAYMENT";
  const completed = booking.status === "COMPLETED";
  const actions = availableStatusActions(booking.status);
  const primaryActions = STATUS_ACTIONS.filter(
    (a) => a.group === "primary" && actions.includes(a.id),
  );
  const negativeActions = STATUS_ACTIONS.filter(
    (a) => a.group === "negative" && actions.includes(a.id),
  );

  const statusWhen =
    shortWhen(
      booking.status === "COMPLETED"
        ? booking.completedAt
        : booking.status === "ARRIVED"
          ? booking.arrivedAt
          : booking.status === "CANCELLED"
            ? booking.cancelledAt
            : booking.confirmedAt,
    ) || shortWhen(booking.createdAt);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function applyStatus(action: StatusUpdateAction) {
    setError("");
    setBusyAction(action);
    const payload =
      action === "CANCEL_PATIENT"
        ? { id: booking.id, status: "CANCELLED", cancelSource: "PATIENT" }
        : action === "CANCEL_CLINIC"
          ? { id: booking.id, status: "CANCELLED", cancelSource: "CLINIC" }
          : { id: booking.id, status: action };

    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível atualizar o status");
        return;
      }
      setBooking((prev) => ({
        ...prev,
        status: data.status,
        cancelSource: data.cancelSource ?? null,
        arrivedAt: data.arrivedAt
          ? new Date(data.arrivedAt).toISOString()
          : prev.arrivedAt,
        completedAt: data.completedAt
          ? new Date(data.completedAt).toISOString()
          : prev.completedAt,
        cancelledAt: data.cancelledAt
          ? new Date(data.cancelledAt).toISOString()
          : prev.cancelledAt,
        confirmedAt: data.confirmedAt
          ? new Date(data.confirmedAt).toISOString()
          : prev.confirmedAt,
      }));
      onChanged?.();
      if (
        data.status === "CANCELLED" ||
        data.status === "NO_SHOW" ||
        data.status === "COMPLETED"
      ) {
        // keep modal open so the user sees the new status
      }
    } catch {
      setError("Falha de conexão ao atualizar status");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="agenda-detail-overlay">
      <button
        type="button"
        className="agenda-detail-backdrop"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`agenda-detail-modal ${
          completed
            ? "is-completed"
            : confirmed
              ? "is-confirmed"
              : pending
                ? "is-pending"
                : "is-neutral"
        }`}
      >
        <div className="agenda-detail-accent" aria-hidden />
        <div className="agenda-detail-header">
          <div className="min-w-0 flex-1">
            <p className="agenda-detail-eyebrow">
              {bookingStatusLabel(booking.status, booking.cancelSource)}
            </p>
            <h2 id={titleId} className="agenda-detail-title">
              {booking.customerName}
            </h2>
            <p className="agenda-detail-when">
              {format(start, "EEEE, d 'de' MMMM", { locale: ptBR })}
              <span aria-hidden> · </span>
              {format(start, "HH:mm")}–{format(end, "HH:mm")}
            </p>
          </div>
          <button
            type="button"
            className="agenda-detail-close"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div
          className={`agenda-detail-status-banner is-${booking.status.toLowerCase()}`}
        >
          <StatusGlyph
            tone={
              booking.status === "COMPLETED"
                ? "done"
                : booking.status === "ARRIVED"
                  ? "arrive"
                  : booking.status === "NO_SHOW"
                    ? "miss"
                    : booking.status === "CANCELLED"
                      ? "cancel"
                      : "done"
            }
          />
          <div>
            <p className="agenda-detail-status-title">
              {bookingStatusLabel(booking.status, booking.cancelSource)}
            </p>
            {statusWhen ? (
              <p className="agenda-detail-status-sub">{statusWhen}</p>
            ) : null}
          </div>
        </div>

        <div className="agenda-detail-body">
          {booking.pageTitle ? (
            <div className="agenda-detail-row">
              <span className="agenda-detail-icon" aria-hidden>
                ⌂
              </span>
              <div>
                <p className="agenda-detail-label">Unidade</p>
                <p className="agenda-detail-value">{booking.pageTitle}</p>
              </div>
            </div>
          ) : null}

          <div className="agenda-detail-row">
            <DetailThumb
              src={booking.serviceImageUrl}
              alt={booking.serviceTitle}
              fallback={booking.serviceTitle.slice(0, 1).toUpperCase() || "S"}
            />
            <div>
              <p className="agenda-detail-label">Serviço</p>
              <p className="agenda-detail-value">{booking.serviceTitle}</p>
              {booking.serviceDurationMinutes ? (
                <p className="agenda-detail-meta">
                  {booking.serviceDurationMinutes} min
                </p>
              ) : null}
            </div>
          </div>

          {booking.professionalName ? (
            <div className="agenda-detail-row">
              <DetailThumb
                src={booking.professionalPhotoUrl}
                alt={booking.professionalName}
                fallback={initials(booking.professionalName)}
                rounded="full"
              />
              <div>
                <p className="agenda-detail-label">Profissional</p>
                <p className="agenda-detail-value">{booking.professionalName}</p>
              </div>
            </div>
          ) : null}

          {booking.customerPhone || booking.customerEmail ? (
            <div className="agenda-detail-row">
              <DetailThumb
                fallback={initials(booking.customerName)}
                alt={booking.customerName}
                rounded="full"
              />
              <div>
                <p className="agenda-detail-label">Contato</p>
                {booking.customerPhone ? (
                  <a
                    href={`tel:${booking.customerPhone}`}
                    className="agenda-detail-value agenda-detail-link"
                  >
                    {booking.customerPhone}
                  </a>
                ) : null}
                {booking.customerEmail ? (
                  <a
                    href={`mailto:${booking.customerEmail}`}
                    className="agenda-detail-value agenda-detail-link"
                  >
                    {booking.customerEmail}
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}

          {(booking.paymentStatus || booking.paymentAmountCents != null) && (
            <div className="agenda-detail-row">
              <span className="agenda-detail-icon" aria-hidden>
                R$
              </span>
              <div>
                <p className="agenda-detail-label">Pagamento</p>
                <p className="agenda-detail-value">
                  {booking.paymentAmountCents != null
                    ? money(booking.paymentAmountCents)
                    : "—"}
                  {booking.paymentStatus
                    ? ` · ${PAYMENT_LABEL[booking.paymentStatus] || booking.paymentStatus}`
                    : ""}
                  {booking.paymentMethod ? ` · ${booking.paymentMethod}` : ""}
                </p>
              </div>
            </div>
          )}

          {booking.googleMeetLink ? (
            <div className="agenda-detail-row">
              <span className="agenda-detail-icon" aria-hidden>
                ▶
              </span>
              <div>
                <p className="agenda-detail-label">Meet</p>
                <a
                  href={booking.googleMeetLink}
                  target="_blank"
                  rel="noreferrer"
                  className="agenda-detail-value agenda-detail-link"
                >
                  Abrir videochamada
                </a>
              </div>
            </div>
          ) : null}

          {(primaryActions.length > 0 || negativeActions.length > 0) && (
            <div className="agenda-status-update">
              <p className="agenda-status-update-title">Atualizar status</p>
              {primaryActions.length > 0 ? (
                <div className="agenda-status-group">
                  {primaryActions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      className="agenda-status-action"
                      disabled={busyAction !== null}
                      onClick={() => void applyStatus(action.id)}
                    >
                      <StatusGlyph tone={action.tone} />
                      <span>
                        {busyAction === action.id ? "Salvando…" : action.label}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
              {negativeActions.length > 0 ? (
                <div className="agenda-status-group">
                  {negativeActions.map((action, idx) => (
                    <button
                      key={action.id}
                      type="button"
                      className={`agenda-status-action ${
                        idx > 0 ? "has-divider" : ""
                      }`}
                      disabled={busyAction !== null}
                      onClick={() => void applyStatus(action.id)}
                    >
                      <StatusGlyph tone={action.tone} />
                      <span>
                        {busyAction === action.id ? "Salvando…" : action.label}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
              {error ? <p className="agenda-status-error">{error}</p> : null}
            </div>
          )}
        </div>

        <div className="agenda-detail-footer">
          <button
            type="button"
            className="agenda-detail-secondary"
            disabled={chartBusy}
            onClick={() => void openChart()}
          >
            {chartBusy ? "Abrindo…" : "Abrir prontuário"}
          </button>
          <a href="/app/agenda/listagem" className="agenda-detail-secondary">
            Ver na lista
          </a>
          <button
            type="button"
            className="agenda-detail-secondary"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
