"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatBRL } from "@/lib/utils";
import { MARITAL_STATUS_LABELS } from "@/lib/intake/templates/company-opening-br";
import type { CompanyOpeningBrData } from "@/lib/intake/types";
import { CheckoutSubnav } from "@/components/admin/CheckoutSubnav";

type Detail = {
  id: string;
  status: string;
  reviewStatus: string;
  data: CompanyOpeningBrData | null;
  attachments: {
    id: string;
    fieldKey: string;
    label: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }[];
  order: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerCpf: string | null;
    paidAt: string | null;
    createdAt: string;
    product: { title: string; priceCents: number };
    payment: { status: string; method: string } | null;
  };
};

export default function IntakeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch(`/api/checkout/intake/${id}`)
      .then((r) => r.json())
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [id]);

  async function updateReview(status: "NEW" | "IN_REVIEW" | "COMPLETED") {
    await fetch(`/api/checkout/intake/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewStatus: status }),
    });
    setDetail((d) => (d ? { ...d, reviewStatus: status } : d));
  }

  async function resendAlert() {
    setResending(true);
    setMsg("");
    const res = await fetch(`/api/checkout/intake/${id}?action=resend-alert`, {
      method: "POST",
    });
    setResending(false);
    setMsg(res.ok ? "E-mail de aviso reenviado." : "Não foi possível reenviar.");
  }

  if (loading) return <p className="text-sm text-muted">Carregando…</p>;
  if (!detail) return <p className="text-sm text-danger">Pedido não encontrado.</p>;

  const data = detail.data;

  return (
    <div className="space-y-6">
      <Link href="/app/intake" className="text-sm text-muted hover:text-foreground">
        ← Intake
      </Link>

      <CheckoutSubnav />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{detail.order.customerName}</h1>
          <p className="mt-1 text-sm text-muted">
            {detail.order.product.title} · {formatBRL(detail.order.product.priceCents)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/checkout/intake/${id}/zip`}
            className="btn-secondary text-sm"
          >
            Baixar ZIP
          </a>
          {detail.status === "PAID" && (
            <button
              type="button"
              className="btn-secondary text-sm"
              disabled={resending}
              onClick={() => void resendAlert()}
            >
              {resending ? "Enviando…" : "Reenviar aviso por e-mail"}
            </button>
          )}
        </div>
      </div>

      {msg && <p className="text-sm text-muted">{msg}</p>}

      <div className="flex flex-wrap gap-2">
        {(["NEW", "IN_REVIEW", "COMPLETED"] as const).map((s) => (
          <button
            key={s}
            type="button"
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              detail.reviewStatus === s
                ? "bg-foreground text-white"
                : "border border-border"
            }`}
            onClick={() => void updateReview(s)}
          >
            {s === "NEW" ? "Novo" : s === "IN_REVIEW" ? "Em análise" : "Concluído"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface space-y-3 p-5">
          <h2 className="font-semibold">Contato</h2>
          <p className="text-sm">{detail.order.customerEmail}</p>
          <p className="text-sm">{detail.order.customerPhone}</p>
          {detail.order.customerCpf && (
            <p className="text-sm text-muted">CPF: {detail.order.customerCpf}</p>
          )}
          {detail.order.paidAt && (
            <p className="text-xs text-muted">
              Pago em{" "}
              {format(new Date(detail.order.paidAt), "dd/MM/yyyy 'às' HH:mm", {
                locale: ptBR,
              })}
            </p>
          )}
        </section>

        {data && (
          <>
            <section className="surface space-y-3 p-5 lg:col-span-2">
              <h2 className="font-semibold">Sócios ({data.partners.length})</h2>
              <div className="space-y-4">
                {data.partners.map((p, i) => (
                  <div key={i} className="rounded-lg border border-border p-4 text-sm">
                    <p className="font-medium">{p.fullName}</p>
                    <p className="text-muted">CPF: {p.cpf} · {p.profession}</p>
                    <p className="text-muted">
                      {MARITAL_STATUS_LABELS[p.maritalStatus]} · {p.email} · {p.phone}
                    </p>
                    <p className="text-muted">{p.address} — CEP {p.zipCode}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="surface space-y-2 p-5">
              <h2 className="font-semibold">Empresa</h2>
              <p className="text-sm"><strong>Fantasia:</strong> {data.tradeName}</p>
              <p className="text-sm"><strong>Preferida:</strong> {data.preferredLegalName}</p>
              <p className="text-sm text-muted">
                Opções: {data.companyNameOptions.join(" · ")}
              </p>
            </section>

            <section className="surface space-y-2 p-5">
              <h2 className="font-semibold">Capital e quadro</h2>
              <p className="text-sm">Capital: R$ {data.shareCapitalReais}</p>
              <ul className="text-sm text-muted">
                {data.ownership.map((o) => (
                  <li key={o.partnerIndex}>
                    Sócio {o.partnerIndex + 1}: {o.percentage}%
                  </li>
                ))}
              </ul>
            </section>

            <section className="surface space-y-2 p-5">
              <h2 className="font-semibold">Administração</h2>
              <p className="text-sm">
                {data.administration.mode === "sole" ? "Isolada" : "Conjunta"}
              </p>
              <p className="text-sm text-muted">
                Administrador(es):{" "}
                {data.administration.administratorPartnerIndices
                  .map((i) => data.partners[i]?.fullName || `Sócio ${i + 1}`)
                  .join(", ")}
              </p>
            </section>

            <section className="surface space-y-2 p-5 lg:col-span-2">
              <h2 className="font-semibold">Atividades</h2>
              <p className="whitespace-pre-wrap text-sm">{data.activities}</p>
            </section>

            <section className="surface space-y-2 p-5">
              <h2 className="font-semibold">Sede</h2>
              <p className="text-sm">{data.headquarters.address}</p>
              <p className="text-sm text-muted">CEP {data.headquarters.zipCode}</p>
              <p className="text-sm text-muted">
                {data.headquarters.isRented ? "Imóvel alugado" : "Imóvel próprio"}
              </p>
            </section>
          </>
        )}

        <section className="surface space-y-3 p-5 lg:col-span-2">
          <h2 className="font-semibold">Documentos ({detail.attachments.length})</h2>
          <ul className="space-y-2">
            {detail.attachments.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{a.label}</p>
                  <p className="text-xs text-muted">{a.fileName}</p>
                </div>
                <a
                  href={`/api/checkout/intake/${id}/attachments/${a.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium hover:underline"
                >
                  Abrir / baixar
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
