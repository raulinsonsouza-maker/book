"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  VisitRecordModal,
  type VisitBooking,
} from "@/components/clients/VisitRecordModal";
import { visitRecordSummary } from "@/lib/visit-record";
import { formatCpf, formatPhoneDisplay } from "@/lib/utils";

type Tab = "timeline" | "bookings" | "payments" | "notes" | "prescriptions";

type Profile = {
  clientNoun: string;
  clientNounPlural: string;
  visitNoun: string;
  visitNounPlural: string;
  chartNoun: string;
  features: {
    visitNotes: boolean;
    prescriptions: boolean;
    attendanceCertificates: boolean;
  };
};

type Customer = {
  id: string;
  name: string;
  phoneE164: string;
  email: string | null;
  cpf: string | null;
  notes: string | null;
  createdAt: string;
};

type BookingRow = VisitBooking & {
  timezone: string;
  serviceImageUrl: string | null;
  professionalPhotoUrl: string | null;
  customerCpf?: string | null;
  customAnswers?: Record<string, string> | null;
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

type TimelineItem = {
  id: string;
  kind: "booking" | "payment" | "note" | "prescription" | "certificate";
  at: string;
  title: string;
  subtitle?: string;
  meta?: Record<string, unknown>;
};

type TimelineFilter = "all" | TimelineItem["kind"];

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

function fmtWhen(iso: string) {
  try {
    return format(parseISO(iso), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return iso;
  }
}

export default function ClienteProntuarioPage() {
  const params = useParams();
  const id = String(params.id || "");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [spentCents, setSpentCents] = useState(0);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [prescriptions, setPrescriptions] = useState<RxRow[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [tab, setTab] = useState<Tab>("timeline");
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedVisit, setSelectedVisit] = useState<VisitBooking | null>(null);
  const [copyMsg, setCopyMsg] = useState("");

  const [noteBody, setNoteBody] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [rxItems, setRxItems] = useState<RxItem[]>([
    { name: "", dose: "", usage: "" },
  ]);
  const [rxNotes, setRxNotes] = useState("");
  const [savingRx, setSavingRx] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError("");
    Promise.all([
      fetch(`/api/clients/${id}`).then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Erro");
        return data;
      }),
      fetch(`/api/clients/${id}/timeline`).then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Erro timeline");
        return data;
      }),
    ])
      .then(([detail, tl]) => {
        setProfile(detail.profile);
        setCustomer(detail.customer);
        setSpentCents(detail.spentCents || 0);
        setBookings(detail.bookings || []);
        setNotes(detail.notes || []);
        setPrescriptions(detail.prescriptions || []);
        setTimeline(tl.items || []);
      })
      .catch((e: Error) => {
        setError(e.message || "Não foi possível carregar");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const tabs = useMemo(() => {
    const list: { id: Tab; label: string }[] = [
      { id: "timeline", label: "Linha do tempo" },
      {
        id: "bookings",
        label: profile?.visitNounPlural || "Agendamentos",
      },
      { id: "payments", label: "Pagamentos" },
    ];
    if (profile?.features.visitNotes) {
      list.push({ id: "notes", label: "Notas" });
    }
    if (profile?.features.prescriptions) {
      list.push({ id: "prescriptions", label: "Prescrições" });
    }
    return list;
  }, [profile]);

  function openVisit(bookingId: string) {
    const b = bookings.find((x) => x.id === bookingId);
    if (!b) return;
    setSelectedVisit(b);
  }

  function bookingIdFromItem(item: TimelineItem): string | null {
    if (typeof item.meta?.bookingId === "string") return item.meta.bookingId;
    if (item.kind === "booking" && item.id.startsWith("booking-")) {
      return item.id.replace(/^booking-/, "");
    }
    return null;
  }

  async function saveNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteBody.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/clients/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: noteBody }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao salvar nota");
        return;
      }
      setNoteBody("");
      load();
      setTab("notes");
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
    if (!items.length) return;
    setSavingRx(true);
    try {
      const res = await fetch(`/api/clients/${id}/prescriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          notes: rxNotes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao salvar prescrição");
        return;
      }
      setRxItems([{ name: "", dose: "", usage: "" }]);
      setRxNotes("");
      load();
      setTab("prescriptions");
    } finally {
      setSavingRx(false);
    }
  }

  const paidBookings = bookings.filter(
    (b) => b.paymentStatus === "PAID" && b.paymentAmountCents != null,
  );

  const filteredTimeline = useMemo(() => {
    if (timelineFilter === "all") return timeline;
    return timeline.filter((i) => i.kind === timelineFilter);
  }, [timeline, timelineFilter]);

  const timelineChips = useMemo(() => {
    const chips: { id: TimelineFilter; label: string }[] = [
      { id: "all", label: "Tudo" },
      { id: "booking", label: profile?.visitNounPlural || "Agendamentos" },
      { id: "payment", label: "Pagamentos" },
    ];
    if (profile?.features.visitNotes) chips.push({ id: "note", label: "Notas" });
    if (profile?.features.prescriptions) {
      chips.push({ id: "prescription", label: "Prescrições" });
    }
    if (profile?.features.attendanceCertificates) {
      chips.push({ id: "certificate", label: "Documentos" });
    }
    return chips;
  }, [profile]);

  async function copyShareUrl(path: string) {
    const absolute = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(absolute);
      setCopyMsg("Link copiado");
      setTimeout(() => setCopyMsg(""), 2000);
    } catch {
      setCopyMsg(absolute);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Carregando prontuário…</p>;
  }

  if (!customer || !profile) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-danger">{error || "Não encontrado"}</p>
        <Link href="/app/clientes" className="text-sm underline">
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {selectedVisit ? (
        <VisitRecordModal
          customerId={customer.id}
          visitNoun={profile.visitNoun}
          booking={selectedVisit}
          notes={notes}
          prescriptions={prescriptions}
          features={{
            visitNotes: profile.features.visitNotes,
            prescriptions: profile.features.prescriptions,
            attendanceCertificates:
              profile.features.attendanceCertificates || false,
          }}
          onClose={() => setSelectedVisit(null)}
          onChanged={load}
        />
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#1a1a1a] text-base font-semibold text-white"
            aria-hidden
          >
            {initials(customer.name)}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {profile.chartNoun}
            </p>
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {customer.name}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {formatPhoneDisplay(customer.phoneE164)}
              {customer.email ? ` · ${customer.email}` : ""}
              {customer.cpf ? ` · CPF ${formatCpf(customer.cpf)}` : ""}
            </p>
            {customer.notes ? (
              <p className="mt-2 max-w-xl text-sm text-foreground/80">
                {customer.notes}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {profile.features.attendanceCertificates ? (
            <Link
              href={`/app/declaracoes?customerId=${customer.id}`}
              className="btn-primary"
            >
              Emitir documento
            </Link>
          ) : null}
          <Link href="/app/agenda/calendario" className="btn-secondary">
            Agendar
          </Link>
          <Link href="/app/clientes" className="btn-secondary">
            Voltar
          </Link>
        </div>
      </div>
      {copyMsg ? <p className="text-sm text-muted">{copyMsg}</p> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-white px-4 py-3 shadow-sm">
          <p className="text-xs text-muted">{profile.visitNounPlural}</p>
          <p className="text-xl font-semibold tabular-nums">{bookings.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white px-4 py-3 shadow-sm">
          <p className="text-xs text-muted">Total gasto</p>
          <p className="text-xl font-semibold tabular-nums">
            {money(spentCents)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-white px-4 py-3 shadow-sm">
          <p className="text-xs text-muted">Cadastro</p>
          <p className="text-xl font-semibold tabular-nums">
            {format(parseISO(customer.createdAt), "dd/MM/yyyy", {
              locale: ptBR,
            })}
          </p>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-1 border-b border-border pb-px">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-3 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "bg-white text-foreground shadow-[0_-1px_0_#fff] ring-1 ring-border ring-b-transparent"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "timeline" ? (
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap gap-1.5">
            {timelineChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setTimelineFilter(chip.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  timelineFilter === chip.id
                    ? "bg-[#1a1a1a] text-white"
                    : "bg-[#f4f2ef] text-muted hover:text-foreground"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
          {filteredTimeline.length === 0 ? (
            <p className="text-sm text-muted">Sem eventos ainda.</p>
          ) : (
            <ol className="relative space-y-0 border-l border-border pl-5">
              {filteredTimeline.map((item) => {
                const bookingId = bookingIdFromItem(item);
                const clickable = Boolean(bookingId);
                const shareUrl =
                  typeof item.meta?.shareUrl === "string"
                    ? item.meta.shareUrl
                    : null;
                const pdfUrl =
                  typeof item.meta?.pdfUrl === "string" ? item.meta.pdfUrl : null;
                const printUrl =
                  typeof item.meta?.printUrl === "string"
                    ? item.meta.printUrl
                    : null;
                return (
                  <li key={item.id} className="relative pb-5 last:pb-0">
                    <span
                      className={`absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white ${
                        item.kind === "payment"
                          ? "bg-emerald-500"
                          : item.kind === "note"
                            ? "bg-amber-500"
                            : item.kind === "prescription"
                              ? "bg-sky-500"
                              : item.kind === "certificate"
                                ? "bg-violet-600"
                                : "bg-[#1a1a1a]"
                      }`}
                    />
                    {clickable ? (
                      <button
                        type="button"
                        className="w-full rounded-xl px-2 py-1.5 text-left transition hover:bg-[#faf8f5]"
                        onClick={() => openVisit(bookingId!)}
                      >
                        <p className="text-xs text-muted">{fmtWhen(item.at)}</p>
                        <p className="font-medium text-foreground">
                          {item.title}
                        </p>
                        {item.subtitle ? (
                          <p className="text-sm text-muted">{item.subtitle}</p>
                        ) : null}
                        <p className="mt-1 text-sm font-medium text-foreground underline-offset-2 hover:underline">
                          Abrir {profile.visitNoun.toLowerCase()}
                        </p>
                      </button>
                    ) : (
                      <div className="px-2 py-1.5">
                        <p className="text-xs text-muted">{fmtWhen(item.at)}</p>
                        <p className="font-medium text-foreground">
                          {item.title}
                        </p>
                        {item.subtitle ? (
                          <p className="text-sm text-muted">{item.subtitle}</p>
                        ) : null}
                        {item.kind === "certificate" ? (
                          <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                            {pdfUrl ? (
                              <a
                                href={pdfUrl}
                                className="font-medium underline-offset-2 hover:underline"
                              >
                                PDF
                              </a>
                            ) : null}
                            {printUrl ? (
                              <a
                                href={printUrl}
                                target="_blank"
                                rel="noopener"
                                className="font-medium underline-offset-2 hover:underline"
                              >
                                Imprimir
                              </a>
                            ) : null}
                            {shareUrl ? (
                              <button
                                type="button"
                                className="font-medium underline-offset-2 hover:underline"
                                onClick={() => void copyShareUrl(shareUrl)}
                              >
                                Copiar link
                              </button>
                            ) : null}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      ) : null}

      {tab === "bookings" ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          {bookings.length === 0 ? (
            <p className="p-5 text-sm text-muted">Nenhum agendamento.</p>
          ) : (
            <ul className="divide-y divide-border">
              {bookings.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-[#faf8f5]"
                    onClick={() => openVisit(b.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{b.serviceTitle}</p>
                      <p className="text-sm text-muted">
                        {fmtWhen(b.startAt)}
                        {b.professionalName ? ` · ${b.professionalName}` : ""}
                        {b.customerCpf
                          ? ` · CPF ${formatCpf(b.customerCpf)}`
                          : ""}
                      </p>
                    </div>
                    <span className="text-xs font-medium uppercase tracking-wide text-muted">
                      {b.status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {tab === "payments" ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          {paidBookings.length === 0 ? (
            <p className="p-5 text-sm text-muted">Nenhum pagamento registrado.</p>
          ) : (
            <ul className="divide-y divide-border">
              {paidBookings.map((b) => (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{b.serviceTitle}</p>
                    <p className="text-sm text-muted">{fmtWhen(b.startAt)}</p>
                  </div>
                  <p className="font-semibold tabular-nums">
                    {money(b.paymentAmountCents || 0)}
                    {b.paymentMethod ? (
                      <span className="ml-2 text-sm font-normal text-muted">
                        {b.paymentMethod}
                      </span>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {tab === "notes" && profile.features.visitNotes ? (
        <div className="space-y-4">
          <form
            onSubmit={saveNote}
            className="rounded-2xl border border-border bg-white p-4 shadow-sm"
          >
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Registrar nota</span>
              <textarea
                className="input-field min-h-[100px]"
                required
                placeholder="Evolução, preferências, observações do atendimento…"
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
              />
            </label>
            <button
              type="submit"
              className="btn-primary mt-3"
              disabled={savingNote}
            >
              {savingNote ? "Salvando…" : "Salvar nota"}
            </button>
          </form>
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            {notes.length === 0 ? (
              <p className="p-5 text-sm text-muted">Nenhuma nota ainda.</p>
            ) : (
              <ul className="divide-y divide-border">
                {notes.map((n) => (
                  <li key={n.id} className="px-4 py-3">
                    <p className="text-xs text-muted">{fmtWhen(n.createdAt)}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                      {visitRecordSummary(n.body)}
                    </p>
                    {n.bookingId ? (
                      <button
                        type="button"
                        className="mt-1 text-sm font-medium underline-offset-2 hover:underline"
                        onClick={() => openVisit(n.bookingId!)}
                      >
                        Abrir {profile.visitNoun.toLowerCase()}
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {tab === "prescriptions" && profile.features.prescriptions ? (
        <div className="space-y-4">
          <form
            onSubmit={saveRx}
            className="space-y-3 rounded-2xl border border-border bg-white p-4 shadow-sm"
          >
            <p className="text-sm font-medium">Nova prescrição / orientação</p>
            <p className="text-xs text-muted">
              Preferência: abra o {profile.visitNoun.toLowerCase()} na linha do
              tempo para vincular a receita ao atendimento.
            </p>
            {rxItems.map((item, idx) => (
              <div
                key={idx}
                className="grid gap-2 rounded-xl border border-border bg-[#faf8f5] p-3 sm:grid-cols-3"
              >
                <label className="text-sm sm:col-span-1">
                  <span className="mb-1 block text-xs text-muted">Item</span>
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
                <label className="text-sm">
                  <span className="mb-1 block text-xs text-muted">Dose</span>
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
                <label className="text-sm">
                  <span className="mb-1 block text-xs text-muted">Uso</span>
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
              className="text-sm font-medium underline-offset-2 hover:underline"
              onClick={() =>
                setRxItems((rows) => [
                  ...rows,
                  { name: "", dose: "", usage: "" },
                ])
              }
            >
              + item
            </button>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-muted">
                Observações gerais
              </span>
              <textarea
                className="input-field min-h-[64px]"
                value={rxNotes}
                onChange={(e) => setRxNotes(e.target.value)}
              />
            </label>
            <button type="submit" className="btn-primary" disabled={savingRx}>
              {savingRx ? "Salvando…" : "Salvar prescrição"}
            </button>
          </form>
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            {prescriptions.length === 0 ? (
              <p className="p-5 text-sm text-muted">Nenhuma prescrição.</p>
            ) : (
              <ul className="divide-y divide-border">
                {prescriptions.map((p) => (
                  <li key={p.id} className="px-4 py-3">
                    <p className="text-xs text-muted">{fmtWhen(p.issuedAt)}</p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {(Array.isArray(p.items) ? p.items : []).map((it, i) => (
                        <li key={i}>
                          <span className="font-medium">{it.name}</span>
                          {it.dose ? ` · ${it.dose}` : ""}
                          {it.usage ? (
                            <span className="text-muted"> — {it.usage}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                    {p.notes ? (
                      <p className="mt-2 text-sm text-muted">{p.notes}</p>
                    ) : null}
                    {p.bookingId ? (
                      <button
                        type="button"
                        className="mt-1 text-sm font-medium underline-offset-2 hover:underline"
                        onClick={() => openVisit(p.bookingId!)}
                      >
                        Abrir {profile.visitNoun.toLowerCase()}
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
