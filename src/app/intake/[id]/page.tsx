"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatBRL } from "@/lib/utils";
import { MARITAL_STATUS_LABELS } from "@/lib/intake/templates/company-opening-br";
import { formatIntakeAddress } from "@/lib/intake/validation/company-opening-br";
import type { CompanyOpeningBrData } from "@/lib/intake/types";

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

const paymentLabel: Record<string, string> = {
  PAID: "Pagamento realizado",
  SUBMITTED: "Aguardando pagamento",
  DRAFT: "Rascunho",
};

const paymentTone: Record<string, string> = {
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-800",
  SUBMITTED: "border-amber-200 bg-amber-50 text-amber-900",
  DRAFT: "border-border bg-muted-bg text-muted",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function fileExt(name: string) {
  const i = name.lastIndexOf(".");
  if (i < 0) return "DOC";
  return name.slice(i + 1).toUpperCase().slice(0, 4) || "DOC";
}

function Field({
  label,
  children,
  mono,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd
        className={`mt-1 break-words text-sm leading-snug ${
          mono ? "font-mono text-[13px] tracking-tight" : ""
        }`}
      >
        {children || "—"}
      </dd>
    </div>
  );
}

function BlockTitle({
  children,
  aside,
}: {
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
        {children}
      </h2>
      {aside}
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [ok, setOk] = useState(false);
  if (!value) return null;
  return (
    <button
      type="button"
      className="rounded px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted transition hover:bg-muted-bg hover:text-foreground"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setOk(true);
          setTimeout(() => setOk(false), 1200);
        });
      }}
    >
      {ok ? "Ok" : "Copiar"}
    </button>
  );
}

export default function IntakeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [msg, setMsg] = useState("");
  const [updatingReview, setUpdatingReview] = useState(false);

  useEffect(() => {
    fetch(`/api/checkout/intake/${id}`)
      .then((r) => r.json())
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [id]);

  async function setCompleted(done: boolean) {
    const reviewStatus = done ? "COMPLETED" : "NEW";
    setUpdatingReview(true);
    await fetch(`/api/checkout/intake/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewStatus }),
    });
    setDetail((d) => (d ? { ...d, reviewStatus } : d));
    setUpdatingReview(false);
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

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-4 w-24 animate-pulse rounded bg-muted-bg" />
        <div className="h-[28rem] animate-pulse rounded-xl bg-muted-bg" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="rounded-xl border border-border bg-white px-6 py-12 text-center">
        <p className="text-sm font-semibold text-danger">Pedido não encontrado</p>
        <Link href="/intake" className="btn-secondary mt-4 inline-flex text-sm">
          Voltar aos dossiês
        </Link>
      </div>
    );
  }

  const data = detail.data;
  const when = detail.order.paidAt || detail.order.createdAt;
  const whenLabel = detail.order.paidAt ? "Pago" : "Criado";
  const isCompleted = detail.reviewStatus === "COMPLETED";
  const isNew = !isCompleted;

  return (
    <div className="space-y-3">
      <Link
        href="/intake"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground"
      >
        <span aria-hidden>←</span> Dossiês
      </Link>

      {/* Um único painel — tudo conectado */}
      <article className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        {/* Cabeçalho */}
        <header className="border-b border-border px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-foreground text-sm font-bold text-white">
                {initials(detail.order.customerName)}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">
                  {detail.order.customerName}
                </h1>
                <p className="mt-0.5 truncate text-sm text-muted">
                  {detail.order.product.title}
                  <span className="mx-1.5 text-border">·</span>
                  {whenLabel}{" "}
                  {format(new Date(when), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                  {detail.order.payment?.method ? (
                    <>
                      <span className="mx-1.5 text-border">·</span>
                      {detail.order.payment.method}
                    </>
                  ) : null}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
              <p className="text-lg font-bold tabular-nums tracking-tight text-emerald-800 sm:text-xl">
                {formatBRL(detail.order.product.priceCents)}
              </p>
              <div className="flex gap-2">
                <a
                  href={`/api/checkout/intake/${id}/zip`}
                  className="btn-primary text-sm"
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
                    {resending ? "…" : "Reenviar aviso"}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Status
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    isNew
                      ? "border-sky-200 bg-sky-50 text-sky-900"
                      : "border-border bg-muted-bg text-muted"
                  }`}
                >
                  Novo
                </span>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    paymentTone[detail.status] ||
                    "border-border bg-muted-bg text-muted"
                  }`}
                >
                  {paymentLabel[detail.status] || detail.status}
                </span>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    isCompleted
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-border bg-muted-bg text-muted"
                  }`}
                >
                  Concluído
                </span>
              </div>
              <p className="mt-2 max-w-md text-xs text-muted">
                {isCompleted
                  ? "Abertura finalizada pela equipe com as informações e documentos."
                  : "Concluído é marcado pela equipe quando o processo de abertura estiver pronto."}
              </p>
            </div>

            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              {isCompleted ? (
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  disabled={updatingReview}
                  onClick={() => void setCompleted(false)}
                >
                  {updatingReview ? "Salvando…" : "Reabrir dossiê"}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary text-sm"
                  disabled={updatingReview}
                  onClick={() => void setCompleted(true)}
                >
                  {updatingReview
                    ? "Salvando…"
                    : "Marcar abertura como concluída"}
                </button>
              )}
              {msg && <span className="text-xs text-emerald-800">{msg}</span>}
            </div>
          </div>
        </header>

        {/* Contato + Documentos */}
        <div className="grid border-b border-border md:grid-cols-2">
          <section className="border-b border-border p-4 sm:p-5 md:border-b-0 md:border-r">
            <BlockTitle>Contato</BlockTitle>
            <dl className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <Field label="E-mail">{detail.order.customerEmail || "—"}</Field>
                <CopyButton value={detail.order.customerEmail} />
              </div>
              <div className="flex items-start justify-between gap-2">
                <Field label="Telefone">{detail.order.customerPhone || "—"}</Field>
                <CopyButton value={detail.order.customerPhone} />
              </div>
              {detail.order.customerCpf && (
                <div className="flex items-start justify-between gap-2">
                  <Field label="CPF" mono>
                    {detail.order.customerCpf}
                  </Field>
                  <CopyButton value={detail.order.customerCpf} />
                </div>
              )}
            </dl>
          </section>

          <section className="p-4 sm:p-5">
            <BlockTitle
              aside={
                <span className="text-[11px] text-muted">
                  {detail.attachments.length} arquivo
                  {detail.attachments.length === 1 ? "" : "s"}
                </span>
              }
            >
              Documentos
            </BlockTitle>
            {detail.attachments.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-muted-bg/40 px-3 py-6 text-center text-sm text-muted">
                Nenhum documento anexado
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {detail.attachments.map((a) => (
                  <li key={a.id}>
                    <a
                      href={`/api/checkout/intake/${id}/attachments/${a.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-muted-bg/60"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted-bg text-[10px] font-bold text-muted">
                        {fileExt(a.fileName)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {a.label}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {a.fileName} · {formatBytes(a.sizeBytes)}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {!data ? (
          <div className="p-5 text-sm text-muted">
            Ainda não há dados preenchidos neste dossiê.
          </div>
        ) : (
          <>
            {/* Sócios */}
            <section className="border-b border-border p-4 sm:p-5">
              <BlockTitle
                aside={
                  <span className="text-[11px] text-muted">
                    {data.partners.length} sócio
                    {data.partners.length === 1 ? "" : "s"}
                  </span>
                }
              >
                Sócios
              </BlockTitle>
              <div className="space-y-3">
                {data.partners.map((p, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border bg-muted-bg/25 p-3.5 sm:p-4"
                  >
                    <div className="mb-3 flex items-center gap-2.5 border-b border-border/70 pb-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold ring-1 ring-border">
                        {initials(p.fullName)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{p.fullName}</p>
                        <p className="text-xs text-muted">Sócio {i + 1}</p>
                      </div>
                    </div>
                    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <Field label="CPF" mono>
                        {p.cpf}
                      </Field>
                      <Field label="Profissão">{p.profession}</Field>
                      <Field label="Estado civil">
                        {MARITAL_STATUS_LABELS[p.maritalStatus]}
                      </Field>
                      <Field label="Telefone">{p.phone}</Field>
                      <Field label="E-mail">{p.email}</Field>
                      <Field label="CEP" mono>
                        {p.zipCode}
                      </Field>
                      <div className="sm:col-span-2 lg:col-span-3">
                        <Field label="Endereço">
                          {formatIntakeAddress(p)}
                        </Field>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            </section>

            {/* Empresa / capital / admin / sede — um bloco só */}
            <section className="border-b border-border">
              <div className="grid sm:grid-cols-2">
                <div className="border-b border-border p-4 sm:border-b-0 sm:border-r sm:p-5">
                  <BlockTitle>Empresa</BlockTitle>
                  <dl className="space-y-3">
                    <Field label="Nome fantasia">{data.tradeName || "—"}</Field>
                    <Field label="Razão preferida">
                      {data.preferredLegalName || "—"}
                    </Field>
                    <Field label="Opções de nome">
                      {data.companyNameOptions.length ? (
                        <span className="text-muted">
                          {data.companyNameOptions.join(" · ")}
                        </span>
                      ) : (
                        "—"
                      )}
                    </Field>
                  </dl>
                </div>

                <div className="border-b border-border p-4 sm:border-b-0 sm:p-5">
                  <BlockTitle>Capital e quadro</BlockTitle>
                  <dl className="space-y-3">
                    <Field label="Capital social">
                      <span className="font-semibold tabular-nums">
                        R$ {data.shareCapitalReais}
                      </span>
                    </Field>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Participação
                      </p>
                      <ul className="mt-1.5 divide-y divide-border rounded-lg border border-border">
                        {data.ownership.map((o) => (
                          <li
                            key={o.partnerIndex}
                            className="flex items-center justify-between gap-3 px-3 py-2"
                          >
                            <span className="truncate text-sm text-muted">
                              {data.partners[o.partnerIndex]?.fullName ||
                                `Sócio ${o.partnerIndex + 1}`}
                            </span>
                            <span className="shrink-0 text-sm font-bold tabular-nums">
                              {o.percentage}%
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </dl>
                </div>

                <div className="border-b border-border p-4 sm:border-b-0 sm:border-r sm:p-5">
                  <BlockTitle>Administração</BlockTitle>
                  <dl className="space-y-3">
                    <Field label="Modo">
                      {data.administration.mode === "sole"
                        ? "Isolada"
                        : "Conjunta"}
                    </Field>
                    <Field label="Administrador(es)">
                      {data.administration.administratorPartnerIndices
                        .map(
                          (i) =>
                            data.partners[i]?.fullName || `Sócio ${i + 1}`,
                        )
                        .join(", ") || "—"}
                    </Field>
                  </dl>
                </div>

                <div className="p-4 sm:p-5">
                  <BlockTitle>Sede</BlockTitle>
                  <dl className="space-y-3">
                    <Field label="Endereço">
                      {formatIntakeAddress(data.headquarters)}
                    </Field>
                    <Field label="CEP" mono>
                      {data.headquarters.zipCode}
                    </Field>
                    <Field label="Imóvel">
                      {data.headquarters.isRented ? "Alugado" : "Próprio"}
                    </Field>
                  </dl>
                </div>
              </div>
            </section>

            {/* Atividades */}
            <section className="p-4 sm:p-5">
              <BlockTitle>Atividades</BlockTitle>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {data.activities || "—"}
              </p>
            </section>
          </>
        )}
      </article>
    </div>
  );
}
