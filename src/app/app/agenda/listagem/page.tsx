"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { formatBRL } from "@/lib/utils";
import { CancelBookingButton } from "@/components/admin/CancelBookingButton";

type Booking = {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  timezone: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  googleEventId: string | null;
  service: { title: string; priceCents: number };
  bookingPage: { title: string };
  payment: {
    status: string;
    method: string;
    amountCents: number;
    paidAt: string | null;
  } | null;
};

const statusLabel: Record<string, string> = {
  CONFIRMED: "Confirmado",
  PENDING_PAYMENT: "Aguardando pagamento",
  CANCELLED: "Cancelado",
  EXPIRED: "Expirado",
};

const paymentLabel: Record<string, string> = {
  PAID: "Pago",
  PENDING: "Pendente",
  FAILED: "Falhou",
  REFUNDED: "Estornado",
};

export default function AgendaListagemPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    fetch(`/api/bookings?${params}`)
      .then((r) => r.json())
      .then(setBookings)
      .finally(() => setLoading(false));
  }, [status, q]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Agenda</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Listagem</h1>
        <p className="mt-2 text-sm text-muted">
          Compromissos criados pelo Book Symbius com status de pagamento.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Buscar nome ou e-mail"
          className="input-field max-w-xs"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="input-field !w-auto"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          <option value="CONFIRMED">Confirmados</option>
          <option value="PENDING_PAYMENT">Aguardando pagamento</option>
          <option value="CANCELLED">Cancelados</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : bookings.length === 0 ? (
        <p className="surface p-8 text-sm text-muted">Nenhum agendamento encontrado.</p>
      ) : (
        <div className="surface overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted-bg text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Serviço</th>
                <th className="px-4 py-3 font-medium">Quando</th>
                <th className="px-4 py-3 font-medium">Pagamento</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bookings.map((b) => {
                const local = toZonedTime(b.startAt, b.timezone);
                return (
                  <tr key={b.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{b.customerName}</p>
                      <p className="text-xs text-muted">{b.customerEmail}</p>
                      <p className="text-xs text-muted">{b.customerPhone}</p>
                    </td>
                    <td className="px-4 py-3">
                      {b.service.title}
                      <p className="text-xs text-muted">{b.bookingPage.title}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {format(local, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </td>
                    <td className="px-4 py-3">
                      {b.payment ? (
                        <>
                          <span className="tag tag-money">
                            {formatBRL(b.payment.amountCents)}
                          </span>
                          <p className="mt-1 text-xs text-muted">
                            {paymentLabel[b.payment.status] || b.payment.status} ·{" "}
                            {b.payment.method}
                          </p>
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="tag">{statusLabel[b.status] || b.status}</span>
                      {b.googleEventId && (
                        <p className="mt-1 text-[10px] text-money">Google ✓</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {b.status !== "CANCELLED" && (
                        <CancelBookingButton id={b.id} onDone={load} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
