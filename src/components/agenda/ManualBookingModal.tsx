"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";

type SlotItem = {
  date: string;
  startAt: string;
  endAt: string;
  label: string;
};

type ProOption = { id: string; displayName: string };

type Props = {
  open: boolean;
  slot: SlotItem | null;
  serviceTitle: string;
  bookingPageId: string;
  serviceId: string;
  businessMode: "SOLO" | "SALON";
  professionalId?: string | null;
  isProfessionalView?: boolean;
  onClose: () => void;
  onCreated: () => void;
};

type Result = {
  status: string;
  manageUrl: string;
  paymentUrl: string | null;
  customerName: string;
};

export function ManualBookingModal({
  open,
  slot,
  serviceTitle,
  bookingPageId,
  serviceId,
  businessMode,
  professionalId = null,
  isProfessionalView = false,
  onClose,
  onCreated,
}: Props) {
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [payOnSite, setPayOnSite] = useState(false);
  const [pickedProId, setPickedProId] = useState("");
  const [professionals, setProfessionals] = useState<ProOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const needsProPick =
    businessMode === "SALON" && !isProfessionalView && !professionalId;

  useEffect(() => {
    if (!open) {
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
      setPayOnSite(false);
      setPickedProId("");
      setError("");
      setResult(null);
      return;
    }
    if (needsProPick) {
      fetch("/api/professionals")
        .then((r) => r.json())
        .then((data) => {
          if (!Array.isArray(data)) return;
          const filtered = data
            .filter(
              (p: { id: string; isActive: boolean; serviceIds: string[] }) =>
                p.isActive && p.serviceIds.includes(serviceId),
            )
            .map((p: { id: string; displayName: string }) => ({
              id: p.id,
              displayName: p.displayName,
            }));
          setProfessionals(filtered);
          if (filtered.length === 1) setPickedProId(filtered[0].id);
        })
        .catch(() => undefined);
    }
  }, [open, needsProPick, serviceId]);

  if (!open || !slot) return null;

  const slotLabel = format(parseISO(slot.startAt), "EEEE, d 'de' MMMM · HH:mm", {
    locale: ptBR,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const effectiveProId = professionalId || pickedProId || undefined;

    const res = await fetch("/api/bookings/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingPageId,
        serviceId,
        startAt: slot!.startAt,
        customerName,
        customerEmail: customerEmail || undefined,
        customerPhone: customerPhone || undefined,
        payOnSite,
        professionalId: effectiveProId,
      }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error || "Não foi possível criar o agendamento");
      return;
    }

    setResult({
      status: data.status,
      manageUrl: data.manageUrl,
      paymentUrl: data.paymentUrl,
      customerName: customerName.trim(),
    });
    onCreated();
  }

  function handleClose() {
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-booking-title"
      >
        {result ? (
          <div className="space-y-4">
            <div>
              <h2
                id="manual-booking-title"
                className="text-base font-semibold tracking-tight"
              >
                {result.status === "CONFIRMED"
                  ? "Agendamento confirmado"
                  : "Aguardando pagamento"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {result.customerName} · {serviceTitle}
                <br />
                {slotLabel}
              </p>
            </div>

            {result.status === "CONFIRMED" ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                Horário reservado com pagamento no local.
              </p>
            ) : (
              <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
                <p>
                  Envie o link abaixo para a cliente concluir o pagamento e
                  confirmar o agendamento.
                </p>
                {result.paymentUrl && (
                  <div className="flex flex-wrap gap-2">
                    <CopyLinkButton
                      url={result.paymentUrl}
                      label="Copiar link de pagamento"
                      className="btn-primary !text-sm"
                    />
                    <a
                      href={result.paymentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary !text-sm"
                    >
                      Abrir link
                    </a>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <CopyLinkButton
                url={result.manageUrl}
                label="Copiar link do agendamento"
                className="btn-secondary !text-sm"
              />
              <button
                type="button"
                className="btn-primary !text-sm"
                onClick={handleClose}
              >
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <h2
                id="manual-booking-title"
                className="text-base font-semibold tracking-tight"
              >
                Novo agendamento manual
              </h2>
              <p className="mt-1 text-sm text-muted">
                {serviceTitle} · {slotLabel}
              </p>
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            {needsProPick && (
              <label className="block text-sm">
                <span className="mb-1 block text-muted">Profissional</span>
                <select
                  className="input-field w-full"
                  value={pickedProId}
                  onChange={(e) => setPickedProId(e.target.value)}
                  required
                >
                  <option value="">Selecione…</option>
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block text-sm">
              <span className="mb-1 block text-muted">Nome da cliente</span>
              <input
                className="input-field w-full"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                minLength={2}
                autoFocus
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-muted">
                E-mail <span className="text-muted/70">(opcional)</span>
              </span>
              <input
                type="email"
                className="input-field w-full"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-muted">
                Telefone <span className="text-muted/70">(opcional)</span>
              </span>
              <input
                type="tel"
                className="input-field w-full"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-[#f7f5f2] px-3 py-3 text-sm">
              <input
                type="checkbox"
                checked={payOnSite}
                onChange={(e) => setPayOnSite(e.target.checked)}
                className="mt-0.5 accent-emerald-600"
              />
              <span>
                <span className="font-medium">Pagamento no local</span>
                <span className="mt-0.5 block text-xs text-muted">
                  Confirma o horário agora. A cliente paga presencialmente no
                  dia.
                </span>
              </span>
            </label>

            {!payOnSite && (
              <p className="text-xs text-muted">
                Sem marcar pagamento no local, será gerado um link para a
                cliente pagar online e confirmar o agendamento.
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                className="btn-primary !text-sm"
                disabled={submitting}
              >
                {submitting ? "Salvando…" : "Criar agendamento"}
              </button>
              <button
                type="button"
                className="btn-secondary !text-sm"
                onClick={handleClose}
                disabled={submitting}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
