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
import {
  formatCpf,
  formatPhone,
  formatPhoneDisplay,
  maskBRLFromDigits,
  normalizeEmailInput,
  parseBRLMaskToCents,
} from "@/lib/utils";
import {
  bookingStatusLabel,
  moneyMethodLabel,
} from "@/lib/booking-status";

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

type ReceitaDoc = {
  id: string;
  bodyText: string | null;
  issuedAt: string;
  createdAt: string;
  visitDate: string;
  pdfUrl: string;
  printUrl: string;
  editUrl: string;
  shareUrl: string | null;
};

type CashEntryRow = {
  id: string;
  amountCents: number;
  method: string;
  description: string;
  occurredAt: string;
  bookingId: string | null;
  source: "manual";
};

type TimelineItem = {
  id: string;
  kind: "booking" | "payment" | "note" | "prescription" | "certificate";
  at: string;
  title: string;
  subtitle?: string;
  meta?: Record<string, unknown>;
};

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
  const [receitaDocs, setReceitaDocs] = useState<ReceitaDoc[]>([]);
  const [cashEntries, setCashEntries] = useState<CashEntryRow[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [tab, setTab] = useState<Tab>("timeline");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedVisit, setSelectedVisit] = useState<VisitBooking | null>(null);
  const [copyMsg, setCopyMsg] = useState("");

  const [noteBody, setNoteBody] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashAmount, setCashAmount] = useState("");
  const [cashMethod, setCashMethod] = useState("CASH");
  const [cashDesc, setCashDesc] = useState("");
  const [cashDate, setCashDate] = useState(() =>
    format(new Date(), "yyyy-MM-dd"),
  );
  const [savingCash, setSavingCash] = useState(false);
  const [showEditPatient, setShowEditPatient] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    email: "",
    cpf: "",
    notes: "",
  });
  const [savingPatient, setSavingPatient] = useState(false);

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
        setReceitaDocs(detail.receitaDocs || []);
        setCashEntries(detail.cashEntries || []);
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

  function openEditPatient() {
    if (!customer) return;
    setEditForm({
      name: customer.name,
      phone: formatPhone(customer.phoneE164.replace(/\D/g, "")),
      email: customer.email || "",
      cpf: customer.cpf ? formatCpf(customer.cpf) : "",
      notes: customer.notes || "",
    });
    setShowEditPatient(true);
  }

  async function savePatient(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm.name.trim() || editForm.phone.replace(/\D/g, "").length < 8) {
      setError("Informe nome e telefone válidos");
      return;
    }
    setSavingPatient(true);
    setError("");
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          phone: editForm.phone,
          email: editForm.email.trim() || null,
          cpf: editForm.cpf || null,
          notes: editForm.notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível salvar");
        return;
      }
      setCustomer((prev) =>
        prev
          ? {
              ...prev,
              name: data.name,
              phoneE164: data.phoneE164,
              email: data.email,
              cpf: data.cpf,
              notes: data.notes,
            }
          : prev,
      );
      setShowEditPatient(false);
    } finally {
      setSavingPatient(false);
    }
  }

  async function saveCash(e: React.FormEvent) {
    e.preventDefault();
    const cents = parseBRLMaskToCents(cashAmount);
    if (!cents || cents <= 0) {
      setError("Informe um valor válido");
      return;
    }
    setSavingCash(true);
    setError("");
    try {
      const res = await fetch("/api/financeiro/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "INCOME",
          amountCents: cents,
          method: cashMethod,
          occurredAt: cashDate,
          description: cashDesc.trim() || "Pagamento recebido",
          customerId: id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao registrar pagamento");
        return;
      }
      setShowCashModal(false);
      setCashAmount("");
      setCashDesc("");
      setCashMethod("CASH");
      load();
      setTab("payments");
    } finally {
      setSavingCash(false);
    }
  }

  const paidBookings = bookings.filter(
    (b) => b.paymentStatus === "PAID" && b.paymentAmountCents != null,
  );

  const paymentRows = useMemo(() => {
    const fromBookings = paidBookings.map((b) => ({
      id: `pay-${b.id}`,
      label: b.serviceTitle,
      when: b.startAt,
      amountCents: b.paymentAmountCents || 0,
      method: b.paymentMethod || "",
      source: "online" as const,
    }));
    const fromCash = cashEntries.map((e) => ({
      id: e.id,
      label: e.description,
      when: e.occurredAt,
      amountCents: e.amountCents,
      method: e.method,
      source: "manual" as const,
    }));
    return [...fromBookings, ...fromCash].sort(
      (a, b) => new Date(b.when).getTime() - new Date(a.when).getTime(),
    );
  }, [paidBookings, cashEntries]);

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

      <div className="space-y-4">
        <Link
          href="/app/clientes"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-foreground"
        >
          <span aria-hidden>←</span>
          {profile.clientNounPlural}
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--ink,#101820)] text-sm font-semibold tracking-wide text-white"
              aria-hidden
            >
              {initials(customer.name)}
            </span>
            <div className="min-w-0 space-y-1.5">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                  {profile.chartNoun}
                </p>
                <h1 className="truncate text-[1.65rem] font-semibold leading-tight tracking-tight">
                  {customer.name}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
                <span>{formatPhoneDisplay(customer.phoneE164)}</span>
                {customer.email ? (
                  <>
                    <span className="text-border" aria-hidden>
                      ·
                    </span>
                    <span className="truncate">{customer.email}</span>
                  </>
                ) : null}
                {customer.cpf ? (
                  <>
                    <span className="text-border" aria-hidden>
                      ·
                    </span>
                    <span>CPF {formatCpf(customer.cpf)}</span>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={openEditPatient}
                  className="ml-0.5 font-medium text-foreground/70 underline-offset-2 hover:text-foreground hover:underline"
                >
                  Editar
                </button>
              </div>
              {customer.notes ? (
                <p className="max-w-xl text-sm leading-relaxed text-foreground/75">
                  {customer.notes}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/app/agenda/calendario?customerId=${customer.id}`}
              className="btn-primary !px-4 !py-2"
            >
              Agendar
            </Link>
            {profile.features.attendanceCertificates ? (
              <Link
                href={`/app/declaracoes?customerId=${customer.id}`}
                className="btn-secondary !px-4 !py-2"
              >
                Documentos
              </Link>
            ) : null}
          </div>
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
          {timeline.length === 0 ? (
            <p className="text-sm text-muted">Sem eventos ainda.</p>
          ) : (
            <ol className="relative space-y-0 border-l border-border pl-5">
              {timeline.map((item) => {
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
                    <span className="text-xs font-medium text-muted">
                      {bookingStatusLabel(b.status)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {tab === "payments" ? (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              type="button"
              className="btn-primary"
              onClick={() => setShowCashModal(true)}
            >
              Registrar pagamento
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            {paymentRows.length === 0 ? (
              <div className="p-5 text-center">
                <p className="text-sm text-muted">Nenhum pagamento registrado.</p>
                <button
                  type="button"
                  className="btn-secondary mt-3"
                  onClick={() => setShowCashModal(true)}
                >
                  Registrar pagamento recebido
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {paymentRows.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{row.label}</p>
                      <p className="text-sm text-muted">
                        {fmtWhen(row.when)}
                        {row.source === "manual" ? " · No local" : ""}
                      </p>
                    </div>
                    <p className="font-semibold tabular-nums">
                      {money(row.amountCents)}
                      {row.method ? (
                        <span className="ml-2 text-sm font-normal text-muted">
                          {moneyMethodLabel(row.method)}
                        </span>
                      ) : null}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted">
              Receitas emitidas em Documentos para este{" "}
              {profile.clientNoun.toLowerCase()}.
            </p>
            <Link
              href={`/app/declaracoes?customerId=${customer.id}&kind=RECEITA`}
              className="btn-primary"
            >
              Nova receita
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            {receitaDocs.length === 0 ? (
              <p className="p-5 text-sm text-muted">Nenhuma receita emitida.</p>
            ) : (
              <ul className="divide-y divide-border">
                {receitaDocs.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted">
                        {fmtWhen(d.createdAt)}
                        {d.visitDate ? ` · Visita ${d.visitDate}` : ""}
                      </p>
                      <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm">
                        {d.bodyText || "Receita"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={d.editUrl} className="btn-secondary !text-sm">
                        Editar
                      </Link>
                      <Link
                        href={d.printUrl}
                        className="btn-secondary !text-sm"
                        target="_blank"
                      >
                        Imprimir
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {prescriptions.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
              <p className="border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted">
                Orientações internas
              </p>
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
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {showEditPatient ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <form
            onSubmit={savePatient}
            className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-white p-5 shadow-xl"
          >
            <h2 className="text-base font-semibold">
              Editar {profile.clientNoun.toLowerCase()}
            </h2>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Nome</span>
              <input
                required
                className="input-field"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Telefone</span>
              <input
                required
                type="tel"
                inputMode="numeric"
                className="input-field"
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    phone: formatPhone(e.target.value),
                  }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">E-mail</span>
              <input
                type="email"
                className="input-field"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    email: normalizeEmailInput(e.target.value),
                  }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">CPF</span>
              <input
                className="input-field"
                inputMode="numeric"
                value={editForm.cpf}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    cpf: formatCpf(e.target.value),
                  }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Observações</span>
              <textarea
                className="input-field min-h-[72px]"
                value={editForm.notes}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="btn-primary"
                disabled={savingPatient}
              >
                {savingPatient ? "Salvando…" : "Salvar"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={savingPatient}
                onClick={() => setShowEditPatient(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {showCashModal ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <form
            onSubmit={saveCash}
            className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-white p-5 shadow-xl"
          >
            <h2 className="text-base font-semibold">Registrar pagamento</h2>
            <p className="text-sm text-muted">
              Lançamento manual para {customer.name}.
            </p>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Valor (R$)</span>
              <input
                required
                className="input-field"
                inputMode="decimal"
                placeholder="0,00"
                value={cashAmount}
                onChange={(e) =>
                  setCashAmount(maskBRLFromDigits(e.target.value))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Data</span>
              <input
                type="date"
                required
                className="input-field"
                value={cashDate}
                onChange={(e) => setCashDate(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Método</span>
              <select
                className="input-field"
                value={cashMethod}
                onChange={(e) => setCashMethod(e.target.value)}
              >
                <option value="CASH">Dinheiro</option>
                <option value="PIX">Pix</option>
                <option value="CARD">Cartão</option>
                <option value="OTHER">Outro</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Descrição</span>
              <input
                className="input-field"
                placeholder="Ex: Consulta particular"
                value={cashDesc}
                onChange={(e) => setCashDesc(e.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="btn-primary"
                disabled={savingCash}
              >
                {savingCash ? "Salvando…" : "Salvar"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={savingCash}
                onClick={() => setShowCashModal(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
