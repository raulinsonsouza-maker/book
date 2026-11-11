"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { bookingStatusLabel } from "@/lib/booking-status";
import {
  decodeVisitRecord,
  emptyVisitRecord,
  encodeVisitRecord,
  visitRecordIsEmpty,
  visitRecordSummary,
  type VisitRecordFields,
} from "@/lib/visit-record";

export type VisitBooking = {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  serviceTitle: string;
  professionalName?: string | null;
  pageTitle?: string | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  paymentAmountCents?: number | null;
  cancelSource?: string | null;
};

type NoteRow = {
  id: string;
  body: string;
  bookingId: string | null;
  createdAt: string;
};

type RxItem = { name: string; dose?: string | null; usage?: string | null };

type RxRow = {
  id: string;
  items: RxItem[];
  notes: string | null;
  bookingId: string | null;
  issuedAt: string;
};

type CertRow = {
  id: string;
  patientName: string;
  visitDate: string;
  startTime: string;
  endTime: string;
};

type Props = {
  customerId: string;
  visitNoun: string;
  booking: VisitBooking;
  notes: NoteRow[];
  prescriptions: RxRow[];
  features: {
    visitNotes: boolean;
    prescriptions: boolean;
    attendanceCertificates: boolean;
  };
  onClose: () => void;
  onChanged: () => void;
};

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function bookingDateParts(iso: string) {
  const d = parseISO(iso);
  return {
    date: format(d, "yyyy-MM-dd"),
    time: format(d, "HH:mm"),
    label: format(d, "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR }),
  };
}

export function VisitRecordModal({
  customerId,
  visitNoun,
  booking,
  notes,
  prescriptions,
  features,
  onClose,
  onChanged,
}: Props) {
  const titleId = useId();
  const bookingNotes = useMemo(
    () => notes.filter((n) => n.bookingId === booking.id),
    [notes, booking.id],
  );
  const bookingRx = useMemo(
    () => prescriptions.filter((p) => p.bookingId === booking.id),
    [prescriptions, booking.id],
  );

  const latest = bookingNotes[0];
  const [fields, setFields] = useState<VisitRecordFields>(() =>
    latest ? decodeVisitRecord(latest.body) : emptyVisitRecord(),
  );
  const [savingNote, setSavingNote] = useState(false);
  const [rxItems, setRxItems] = useState<RxItem[]>([
    { name: "", dose: "", usage: "" },
  ]);
  const [rxNotes, setRxNotes] = useState("");
  const [savingRx, setSavingRx] = useState(false);
  const [certs, setCerts] = useState<CertRow[]>([]);
  const [savingCert, setSavingCert] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const when = bookingDateParts(booking.startAt);
  const endTime = bookingDateParts(booking.endAt).time;

  useEffect(() => {
    setFields(latest ? decodeVisitRecord(latest.body) : emptyVisitRecord());
  }, [latest]);

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

  useEffect(() => {
    if (!features.attendanceCertificates) return;
    fetch(`/api/declaracoes?q=${encodeURIComponent(booking.customerName)}`)
      .then(async (r) => {
        if (!r.ok) return;
        const data = await r.json();
        const items = (data.items || []) as CertRow[];
        setCerts(
          items.filter(
            (c) =>
              c.visitDate === when.date &&
              c.patientName.trim().toLowerCase() ===
                booking.customerName.trim().toLowerCase(),
          ),
        );
      })
      .catch(() => undefined);
  }, [
    features.attendanceCertificates,
    booking.customerName,
    when.date,
  ]);

  async function saveNote(e: React.FormEvent) {
    e.preventDefault();
    if (visitRecordIsEmpty(fields)) {
      setError("Preencha ao menos um campo do registro");
      return;
    }
    setSavingNote(true);
    setError("");
    setOkMsg("");
    try {
      const res = await fetch(`/api/clients/${customerId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: encodeVisitRecord(fields),
          bookingId: booking.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível salvar o registro");
        return;
      }
      setOkMsg("Registro do atendimento salvo");
      onChanged();
    } catch {
      setError("Falha de rede ao salvar registro");
    } finally {
      setSavingNote(false);
    }
  }

  async function saveRx(e: React.FormEvent) {
    e.preventDefault();
    const items = rxItems
      .map((i) => ({
        name: (i.name || "").trim(),
        dose: (i.dose || "").trim() || null,
        usage: (i.usage || "").trim() || null,
      }))
      .filter((i) => i.name);
    if (!items.length) {
      setError("Informe ao menos um item da receita");
      return;
    }
    setSavingRx(true);
    setError("");
    setOkMsg("");
    try {
      const res = await fetch(`/api/clients/${customerId}/prescriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          notes: rxNotes.trim() || null,
          bookingId: booking.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível salvar a prescrição");
        return;
      }
      setRxItems([{ name: "", dose: "", usage: "" }]);
      setRxNotes("");
      setOkMsg("Prescrição registrada neste atendimento");
      onChanged();
    } catch {
      setError("Falha de rede ao salvar prescrição");
    } finally {
      setSavingRx(false);
    }
  }

  async function issueCertificate() {
    setSavingCert(true);
    setError("");
    setOkMsg("");
    try {
      const res = await fetch("/api/declaracoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: booking.customerName,
          visitDate: when.date,
          startTime: when.time,
          endTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível emitir o atestado");
        return;
      }
      if (data.item) {
        setCerts((prev) => [data.item, ...prev]);
      }
      setOkMsg("Declaração de comparecimento emitida");
      onChanged();
    } catch {
      setError("Falha de rede ao emitir atestado");
    } finally {
      setSavingCert(false);
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
        className="visit-record-modal"
      >
        <div className="agenda-detail-accent" aria-hidden />
        <div className="agenda-detail-header">
          <div className="min-w-0 flex-1">
            <p className="agenda-detail-eyebrow">{visitNoun}</p>
            <h2 id={titleId} className="agenda-detail-title">
              {booking.serviceTitle}
            </h2>
            <p className="agenda-detail-when">{when.label}</p>
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

        <div className="visit-record-meta">
          <span>
            {bookingStatusLabel(booking.status, booking.cancelSource)}
          </span>
          {booking.professionalName ? (
            <span>· {booking.professionalName}</span>
          ) : null}
          {booking.pageTitle ? <span>· {booking.pageTitle}</span> : null}
          {booking.paymentAmountCents != null ? (
            <span>
              · {money(booking.paymentAmountCents)}
              {booking.paymentStatus ? ` (${booking.paymentStatus})` : ""}
            </span>
          ) : null}
        </div>

        <div className="visit-record-body">
          {error ? <p className="agenda-status-error">{error}</p> : null}
          {okMsg ? <p className="visit-record-ok">{okMsg}</p> : null}

          {features.visitNotes ? (
            <section className="visit-record-section">
              <h3>Registro do {visitNoun.toLowerCase()}</h3>
              <p className="visit-record-hint">
                Centralize aqui o que aconteceu: queixa, conduta, orientações e
                observações.
              </p>
              <form onSubmit={saveNote} className="visit-record-form">
                <label>
                  <span>Queixa / motivo</span>
                  <textarea
                    className="input-field min-h-[64px]"
                    value={fields.complaint}
                    onChange={(e) =>
                      setFields((f) => ({ ...f, complaint: e.target.value }))
                    }
                    placeholder="O que trouxe o paciente / cliente"
                  />
                </label>
                <label>
                  <span>O que foi tratado / realizado</span>
                  <textarea
                    className="input-field min-h-[88px]"
                    value={fields.treated}
                    onChange={(e) =>
                      setFields((f) => ({ ...f, treated: e.target.value }))
                    }
                    placeholder="Procedimentos, avaliação, conduta…"
                  />
                </label>
                <label>
                  <span>Orientações</span>
                  <textarea
                    className="input-field min-h-[64px]"
                    value={fields.guidance}
                    onChange={(e) =>
                      setFields((f) => ({ ...f, guidance: e.target.value }))
                    }
                    placeholder="Cuidados, retorno, restrições…"
                  />
                </label>
                <label>
                  <span>Observações internas</span>
                  <textarea
                    className="input-field min-h-[56px]"
                    value={fields.extras}
                    onChange={(e) =>
                      setFields((f) => ({ ...f, extras: e.target.value }))
                    }
                    placeholder="Notas só para a equipe"
                  />
                </label>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={savingNote}
                >
                  {savingNote ? "Salvando…" : "Salvar registro"}
                </button>
              </form>

              {bookingNotes.length > 1 ? (
                <div className="visit-record-history">
                  <p className="visit-record-history-title">Histórico neste atendimento</p>
                  <ul>
                    {bookingNotes.slice(1).map((n) => (
                      <li key={n.id}>
                        <span>
                          {format(parseISO(n.createdAt), "dd/MM HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                        {visitRecordSummary(n.body)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}

          {features.prescriptions ? (
            <section className="visit-record-section">
              <h3>Receita / orientação</h3>
              <p className="visit-record-hint">
                Registro operacional ligado a este {visitNoun.toLowerCase()}.
              </p>
              {bookingRx.length > 0 ? (
                <ul className="visit-record-rx-list">
                  {bookingRx.map((p) => (
                    <li key={p.id}>
                      <p className="text-xs text-muted">
                        {format(parseISO(p.issuedAt), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                      {(Array.isArray(p.items) ? p.items : []).map((it, i) => (
                        <p key={i}>
                          <strong>{it.name}</strong>
                          {it.dose ? ` · ${it.dose}` : ""}
                          {it.usage ? ` — ${it.usage}` : ""}
                        </p>
                      ))}
                      {p.notes ? (
                        <p className="text-sm text-muted">{p.notes}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              <form onSubmit={saveRx} className="visit-record-form">
                {rxItems.map((item, idx) => (
                  <div key={idx} className="visit-record-rx-grid">
                    <label>
                      <span>Item</span>
                      <input
                        className="input-field"
                        value={item.name}
                        onChange={(e) =>
                          setRxItems((rows) =>
                            rows.map((r, i) =>
                              i === idx ? { ...r, name: e.target.value } : r,
                            ),
                          )
                        }
                        required={idx === 0}
                      />
                    </label>
                    <label>
                      <span>Dose</span>
                      <input
                        className="input-field"
                        value={item.dose || ""}
                        onChange={(e) =>
                          setRxItems((rows) =>
                            rows.map((r, i) =>
                              i === idx ? { ...r, dose: e.target.value } : r,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      <span>Uso</span>
                      <input
                        className="input-field"
                        value={item.usage || ""}
                        onChange={(e) =>
                          setRxItems((rows) =>
                            rows.map((r, i) =>
                              i === idx ? { ...r, usage: e.target.value } : r,
                            ),
                          )
                        }
                      />
                    </label>
                  </div>
                ))}
                <button
                  type="button"
                  className="visit-record-linkish"
                  onClick={() =>
                    setRxItems((rows) => [
                      ...rows,
                      { name: "", dose: "", usage: "" },
                    ])
                  }
                >
                  + item
                </button>
                <label>
                  <span>Observações da receita</span>
                  <textarea
                    className="input-field min-h-[56px]"
                    value={rxNotes}
                    onChange={(e) => setRxNotes(e.target.value)}
                  />
                </label>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={savingRx}
                >
                  {savingRx ? "Salvando…" : "Salvar receita"}
                </button>
              </form>
            </section>
          ) : null}

          {features.attendanceCertificates ? (
            <section className="visit-record-section">
              <h3>Atestado / declaração</h3>
              <p className="visit-record-hint">
                Emite declaração de comparecimento com os horários deste{" "}
                {visitNoun.toLowerCase()}.
              </p>
              {certs.length > 0 ? (
                <ul className="visit-record-cert-list">
                  {certs.map((c) => (
                    <li key={c.id}>
                      <span>
                        {c.visitDate} · {c.startTime}–{c.endTime}
                      </span>
                      <a
                        href={`/app/declaracoes/${c.id}/imprimir`}
                        target="_blank"
                        rel="noreferrer"
                        className="visit-record-linkish"
                      >
                        Abrir / imprimir
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Nenhum atestado neste dia ainda.</p>
              )}
              <button
                type="button"
                className="btn-secondary"
                disabled={savingCert}
                onClick={() => void issueCertificate()}
              >
                {savingCert ? "Emitindo…" : "Emitir declaração de comparecimento"}
              </button>
            </section>
          ) : null}
        </div>

        <div className="agenda-detail-footer">
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
