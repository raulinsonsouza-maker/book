import { requireOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { formatBRL } from "@/lib/utils";
import { CancelBookingButton } from "@/components/admin/CancelBookingButton";

const statusLabel: Record<string, string> = {
  CONFIRMED: "Confirmado",
  PENDING_PAYMENT: "Aguardando pagamento",
  CANCELLED: "Cancelado",
  EXPIRED: "Expirado",
};

export default async function BookingsPage() {
  const { org } = await requireOrg();
  const bookings = await prisma.booking.findMany({
    where: { bookingPage: { organizationId: org.id } },
    include: {
      service: true,
      bookingPage: true,
      payment: true,
    },
    orderBy: { startAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Agenda</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
          Agendamentos
        </h1>
        <p className="mt-2 text-sm text-muted">
          Lista de reservas e status de pagamento.
        </p>
      </div>

      {bookings.length === 0 ? (
        <p className="surface p-8 text-sm text-muted">
          Nenhum agendamento ainda.
        </p>
      ) : (
        <div className="surface overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted-bg text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">
                  Serviço
                </th>
                <th className="px-4 py-3 font-medium">Quando</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">
                  Valor
                </th>
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
                      <p className="text-muted">{b.customerEmail}</p>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      {b.service.title}
                    </td>
                    <td className="px-4 py-3">
                      {format(local, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`tag ${
                          b.status === "CONFIRMED"
                            ? "!bg-emerald-50 !text-emerald-700"
                            : b.status === "PENDING_PAYMENT"
                              ? "!bg-amber-50 !text-amber-800"
                              : ""
                        }`}
                      >
                        {statusLabel[b.status] || b.status}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      {formatBRL(b.service.priceCents)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {b.status !== "CANCELLED" && (
                        <CancelBookingButton id={b.id} />
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
