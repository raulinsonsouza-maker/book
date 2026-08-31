"use client";

import { useEffect, useState } from "react";
import { formatBRL } from "@/lib/utils";

type PayRow = {
  id: string;
  amountCents: number;
  status: string;
  description: string | null;
  createdAt: string;
  organization: { name: string };
};

type MpStatus = {
  configured: boolean;
  billingEnabled: boolean;
  ping: { ok: boolean; nickname?: string; error?: string } | null;
};

export default function GerencialPagamentosPage() {
  const [payments, setPayments] = useState<PayRow[]>([]);
  const [mp, setMp] = useState<MpStatus | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/gerencial/payments").then((r) => r.json()),
      fetch("/api/gerencial/payments/status").then((r) => r.json()),
    ]).then(([p, s]) => {
      setPayments(p);
      setMp(s);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="surface space-y-2 p-5">
        <h2 className="font-semibold">Mercado Pago da Symbius</h2>
        {!mp ? (
          <p className="text-sm text-muted">Carregando…</p>
        ) : (
          <>
            <p className="text-sm">
              Billing:{" "}
              <strong>{mp.billingEnabled ? "ativado" : "desativado"}</strong>
            </p>
            <p className="text-sm">
              Credenciais:{" "}
              <strong>{mp.configured ? "configuradas" : "faltando no .env"}</strong>
            </p>
            {mp.ping && (
              <p className="text-sm text-muted">
                {mp.ping.ok
                  ? `Conexão OK${mp.ping.nickname ? ` (${mp.ping.nickname})` : ""}`
                  : `Erro: ${mp.ping.error}`}
              </p>
            )}
            <p className="text-xs text-muted">
              Variáveis: PLATFORM_MERCADOPAGO_ACCESS_TOKEN,
              PLATFORM_MERCADOPAGO_PUBLIC_KEY, PLATFORM_BILLING_ENABLED=true
            </p>
          </>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted-bg/50 text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Data</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">{p.organization.name}</td>
                <td className="px-4 py-3">{formatBRL(p.amountCents)}</td>
                <td className="px-4 py-3">{p.status}</td>
                <td className="px-4 py-3 text-muted">
                  {new Date(p.createdAt).toLocaleString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
