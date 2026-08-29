"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatBRL } from "@/lib/utils";
import { CheckoutSubnav } from "@/components/admin/CheckoutSubnav";

type Order = {
  id: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCpf: string | null;
  customAnswers: string | null;
  createdAt: string;
  paidAt: string | null;
  product: { id: string; title: string; priceCents: number };
  checkoutLink: { slug: string; title: string | null };
  payment: {
    status: string;
    method: string;
    amountCents: number;
    paidAt: string | null;
  } | null;
};

type ProductOption = { id: string; title: string };

const statusLabel: Record<string, string> = {
  PAID: "Pago",
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

export default function CheckoutVendasPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [status, setStatus] = useState("");
  const [productId, setProductId] = useState("");
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/checkout/products")
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (productId) params.set("productId", productId);
    if (q) params.set("q", q);
    fetch(`/api/checkout/orders?${params}`)
      .then((r) => r.json())
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [status, productId, q]);

  useEffect(() => {
    load();
  }, [load]);

  function parseAnswers(raw: string | null) {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Record<string, string>;
    } catch {
      return null;
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Clientes que pagaram via checkout instantâneo.
      </p>

      <CheckoutSubnav />

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Buscar nome ou e-mail"
          className="input-field max-w-xs"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input-field max-w-[180px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="PAID">Pago</option>
          <option value="PENDING_PAYMENT">Aguardando</option>
          <option value="EXPIRED">Expirado</option>
        </select>
        <select className="input-field max-w-[200px]" value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">Todos os produtos</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma venda encontrada.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted-bg text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Pagamento</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const answers = parseAnswers(o.customAnswers);
                const isOpen = expanded === o.id;
                return (
                  <Fragment key={o.id}>
                    <tr key={o.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium">{o.customerName}</p>
                        <p className="text-xs text-muted">{o.customerEmail}</p>
                      </td>
                      <td className="px-4 py-3">{o.product.title}</td>
                      <td className="px-4 py-3">{formatBRL(o.product.priceCents)}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-muted-bg px-2 py-0.5 text-xs">
                          {paymentLabel[o.payment?.status || ""] || statusLabel[o.status] || o.status}
                        </span>
                        {o.payment?.method && (
                          <span className="ml-1 text-xs text-muted">{o.payment.method}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {format(
                          new Date(o.paidAt || o.createdAt),
                          "d MMM yyyy · HH:mm",
                          { locale: ptBR },
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="text-xs font-medium text-muted hover:text-foreground"
                          onClick={() => setExpanded(isOpen ? null : o.id)}
                        >
                          {isOpen ? "Ocultar" : "Detalhes"}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${o.id}-detail`} className="bg-muted-bg/50">
                        <td colSpan={6} className="px-4 py-3 text-sm">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <p><strong>Telefone:</strong> {o.customerPhone || "—"}</p>
                            <p><strong>CPF:</strong> {o.customerCpf || "—"}</p>
                            <p><strong>Link:</strong> /pay/{o.checkoutLink.slug}</p>
                            {answers &&
                              Object.entries(answers).map(([k, v]) => (
                                <p key={k}>
                                  <strong>{k}:</strong> {v}
                                </p>
                              ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
