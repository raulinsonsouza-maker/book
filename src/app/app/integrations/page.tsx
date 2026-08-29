"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AsaasIcon } from "@/components/icons/AsaasIcon";
import { GoogleCalendarIcon } from "@/components/icons/GoogleCalendarIcon";
import { MercadoPagoIcon } from "@/components/icons/MercadoPagoIcon";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { ASAAS_ENABLED, CAKTO_ENABLED } from "@/lib/feature-flags";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type PaymentProvider = "CAKTO" | "MERCADO_PAGO" | "ASAAS";

type Org = {
  caktoConnected: boolean;
  mercadoPagoConnected: boolean;
  mercadoPagoUserId: string | null;
  asaasConnected: boolean;
  asaasAccountEmail: string | null;
  paymentProvider: PaymentProvider;
};

type GoogleStatus = {
  configured: boolean;
  connected: boolean;
  email: string | null;
};

function providerLabel(p: PaymentProvider) {
  if (p === "MERCADO_PAGO") return "Mercado Pago";
  if (p === "ASAAS") return "Asaas";
  return "Cakto";
}

export default function IntegrationsPage() {
  const { confirm } = useConfirm();
  const [org, setOrg] = useState<Org | null>(null);
  const [google, setGoogle] = useState<GoogleStatus | null>(null);
  const [msg, setMsg] = useState("");
  const [msgTone, setMsgTone] = useState<"ok" | "err">("ok");
  const [savingDefault, setSavingDefault] = useState(false);

  useEffect(() => {
    fetch("/api/organization")
      .then((r) => r.json())
      .then(setOrg);
    fetch("/api/google/status")
      .then((r) => r.json())
      .then(setGoogle);

    const params = new URLSearchParams(window.location.search);
    const g = params.get("google");
    if (g === "connected") {
      setMsgTone("ok");
      setMsg(
        "Google Agenda conectada. Compromissos aparecem no Calendário e horários ocupados bloqueiam o funil.",
      );
      fetch("/api/google/status")
        .then((r) => r.json())
        .then(setGoogle);
    } else if (g === "error") {
      setMsgTone("err");
      setMsg("Não foi possível conectar o Google. Tente de novo.");
    } else if (g === "forbidden") {
      setMsgTone("err");
      setMsg("Sessão inválida na conexão Google. Entre de novo e tente outra vez.");
    } else if (g === "missing_env") {
      setMsgTone("err");
      setMsg(
        "Google Agenda não está configurado neste ambiente (credenciais ausentes).",
      );
    }
    if (g) {
      const url = new URL(window.location.href);
      url.searchParams.delete("google");
      window.history.replaceState({}, "", url.pathname);
    }
  }, []);

  async function disconnectGoogle() {
    const ok = await confirm({
      title: "Desconectar Google Agenda?",
      description: "Novos agendamentos deixam de sincronizar com o Calendar até reconectar.",
      confirmLabel: "Desconectar",
      cancelLabel: "Manter conectado",
      tone: "danger",
    });
    if (!ok) return;
    await fetch("/api/google/status", { method: "DELETE" });
    setGoogle((g) => (g ? { ...g, connected: false, email: null } : null));
    setMsgTone("ok");
    setMsg("Google Agenda desconectada");
  }

  async function disconnectMercadoPago() {
    const ok = await confirm({
      title: "Desconectar Mercado Pago?",
      description: "Pix e cartão via Mercado Pago param de funcionar até reconectar.",
      confirmLabel: "Desconectar",
      cancelLabel: "Manter conectado",
      tone: "danger",
    });
    if (!ok) return;
    await fetch("/api/mercadopago/status", { method: "DELETE" });
    setOrg(await fetch("/api/organization").then((r) => r.json()));
    setMsg("Mercado Pago desconectado");
  }

  async function disconnectAsaas() {
    const ok = await confirm({
      title: "Desconectar Asaas?",
      description: "Pagamentos via Asaas param de funcionar até reconectar.",
      confirmLabel: "Desconectar",
      cancelLabel: "Manter conectado",
      tone: "danger",
    });
    if (!ok) return;
    await fetch("/api/asaas/status", { method: "DELETE" });
    setOrg(await fetch("/api/organization").then((r) => r.json()));
    setMsg("Asaas desconectado");
  }

  async function disconnectCakto() {
    const ok = await confirm({
      title: "Desconectar Cakto?",
      description: "Pagamentos via Cakto param de funcionar até reconectar.",
      confirmLabel: "Desconectar",
      cancelLabel: "Manter conectado",
      tone: "danger",
    });
    if (!ok) return;
    const nextProvider =
      org?.paymentProvider === "CAKTO" && org.mercadoPagoConnected
        ? "MERCADO_PAGO"
        : org?.paymentProvider === "CAKTO" && org.asaasConnected
          ? "ASAAS"
          : undefined;
    await fetch("/api/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caktoClientId: null,
        caktoClientSecret: null,
        caktoSdkClientId: null,
        caktoOfferId: null,
        ...(nextProvider ? { paymentProvider: nextProvider } : {}),
      }),
    });
    setOrg(await fetch("/api/organization").then((r) => r.json()));
    setMsg("Cakto desconectada");
  }

  async function setDefaultProvider(provider: PaymentProvider) {
    if (!org || org.paymentProvider === provider) return;
    setSavingDefault(true);
    setMsg("");
    const res = await fetch("/api/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentProvider: provider }),
    });
    const data = await res.json();
    setSavingDefault(false);
    if (!res.ok) {
      setMsg(data.error || "Não foi possível alterar o provedor padrão");
      return;
    }
    setOrg(data);
    setMsg(
      `Provedor padrão: ${providerLabel(provider)}. Agendamentos e checkout rápido usarão esta integração.`,
    );
  }

  const connectedPayments = [
    org?.mercadoPagoConnected ? "mp" : null,
    ASAAS_ENABLED && org?.asaasConnected ? "asaas" : null,
    CAKTO_ENABLED && org?.caktoConnected ? "cakto" : null,
  ].filter(Boolean);

  const showProviderPicker = connectedPayments.length >= 2;

  function paymentStatus(connected: boolean, isDefault: boolean) {
    if (!connected) return "Não conectado";
    if (showProviderPicker) return isDefault ? "Padrão" : "Conectado";
    return "Ativo";
  }

  return (
    <div className="space-y-6">
      {msg && (
        <p
          className={`rounded-xl border px-4 py-3 text-sm ${
            msgTone === "err"
              ? "border-red-200 bg-red-50 text-danger"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          {msg}
        </p>
      )}

      <p className="text-sm text-muted">
        Conecte serviços externos para sincronizar agenda e receber pagamentos.
      </p>

      {showProviderPicker && org && (
        <div className="surface space-y-4 p-5">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Provedor de pagamento padrão
            </h2>
            <p className="mt-1 text-sm text-muted">
              Define qual integração processa pagamentos de{" "}
              <strong className="text-foreground">agendamentos</strong> e{" "}
              <strong className="text-foreground">checkout rápido</strong>.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {org.mercadoPagoConnected && (
              <button
                type="button"
                disabled={savingDefault}
                onClick={() => setDefaultProvider("MERCADO_PAGO")}
                className={`rounded-xl border p-4 text-left transition ${
                  org.paymentProvider === "MERCADO_PAGO"
                    ? "border-foreground bg-muted-bg ring-1 ring-foreground"
                    : "border-border bg-white hover:border-foreground/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <MercadoPagoIcon size={24} />
                  <div>
                    <p className="font-medium">Mercado Pago</p>
                    <p className="text-xs text-muted">Pix e cartão</p>
                  </div>
                </div>
                {org.paymentProvider === "MERCADO_PAGO" && (
                  <span className="mt-3 inline-block text-xs font-medium text-emerald-700">
                    Padrão ativo
                  </span>
                )}
              </button>
            )}

            {ASAAS_ENABLED && org.asaasConnected && (
              <button
                type="button"
                disabled={savingDefault}
                onClick={() => setDefaultProvider("ASAAS")}
                className={`rounded-xl border p-4 text-left transition ${
                  org.paymentProvider === "ASAAS"
                    ? "border-foreground bg-muted-bg ring-1 ring-foreground"
                    : "border-border bg-white hover:border-foreground/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <AsaasIcon size={24} />
                  <div>
                    <p className="font-medium">Asaas</p>
                    <p className="text-xs text-muted">Pix e cartão</p>
                  </div>
                </div>
                {org.paymentProvider === "ASAAS" && (
                  <span className="mt-3 inline-block text-xs font-medium text-emerald-700">
                    Padrão ativo
                  </span>
                )}
              </button>
            )}

            {CAKTO_ENABLED && org.caktoConnected && (
              <button
                type="button"
                disabled={savingDefault}
                onClick={() => setDefaultProvider("CAKTO")}
                className={`rounded-xl border p-4 text-left transition ${
                  org.paymentProvider === "CAKTO"
                    ? "border-foreground bg-muted-bg ring-1 ring-foreground"
                    : "border-border bg-white hover:border-foreground/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-sm font-bold text-emerald-600">
                    C
                  </span>
                  <div>
                    <p className="font-medium">Cakto</p>
                    <p className="text-xs text-muted">Pix e cartão</p>
                  </div>
                </div>
                {org.paymentProvider === "CAKTO" && (
                  <span className="mt-3 inline-block text-xs font-medium text-emerald-700">
                    Padrão ativo
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {!showProviderPicker && org && (org.mercadoPagoConnected || org.asaasConnected) && (
        <p className="surface px-4 py-3 text-sm text-muted">
          Pagamentos processados via{" "}
          <strong className="text-foreground">
            {providerLabel(org.paymentProvider)}
          </strong>
          .
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <IntegrationCard
          icon={<GoogleCalendarIcon size={28} />}
          title="Google Calendar"
          status={google?.connected ? "Conectado" : "Não conectado"}
          statusVariant={google?.connected ? "connected" : "disconnected"}
          description="Conecte para: (1) ver compromissos do Google no Calendário do Book, (2) bloquear horários ocupados no funil público e (3) enviar reservas confirmadas para o Google. Compromissos externos não viram agendamentos na Listagem — aparecem no Calendário (filtro Google)."
          action={
            google?.connected ? (
              <div className="space-y-2">
                <p className="truncate text-xs text-muted">{google.email}</p>
                <button
                  type="button"
                  onClick={disconnectGoogle}
                  className="btn-secondary w-full text-danger"
                >
                  Desconectar
                </button>
              </div>
            ) : google?.configured ? (
              <a href="/api/google/connect" className="btn-primary w-full">
                Conectar
              </a>
            ) : (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Conexão com Google temporariamente indisponível.
              </p>
            )
          }
        />

        <IntegrationCard
          icon={<MercadoPagoIcon size={28} />}
          title="Mercado Pago"
          status={paymentStatus(
            Boolean(org?.mercadoPagoConnected),
            org?.paymentProvider === "MERCADO_PAGO",
          )}
          statusVariant={org?.mercadoPagoConnected ? "connected" : "disconnected"}
          description="Checkout transparente com Pix e cartão. Pagamento dentro do funil, sem redirecionamento."
          action={
            org?.mercadoPagoConnected ? (
              <div className="space-y-2">
                {org.mercadoPagoUserId && (
                  <p className="truncate text-xs text-muted">
                    ID vendedor: {org.mercadoPagoUserId}
                  </p>
                )}
                {showProviderPicker && org.paymentProvider !== "MERCADO_PAGO" && (
                  <button
                    type="button"
                    disabled={savingDefault}
                    onClick={() => setDefaultProvider("MERCADO_PAGO")}
                    className="btn-primary w-full"
                  >
                    Usar como padrão
                  </button>
                )}
                <button
                  type="button"
                  onClick={disconnectMercadoPago}
                  className="btn-secondary w-full text-danger"
                >
                  Desconectar
                </button>
              </div>
            ) : (
              <Link href="/app/integrations/mercadopago" className="btn-primary w-full">
                Conectar
              </Link>
            )
          }
        />

        {ASAAS_ENABLED && (
          <IntegrationCard
            icon={<AsaasIcon size={28} />}
            title="Asaas"
            status={paymentStatus(
              Boolean(org?.asaasConnected),
              org?.paymentProvider === "ASAAS",
            )}
            statusVariant={org?.asaasConnected ? "connected" : "disconnected"}
            description="Pix e cartão via Asaas. Conecte com a API Key da sua conta em poucos passos."
            action={
              org?.asaasConnected ? (
                <div className="space-y-2">
                  {org.asaasAccountEmail && (
                    <p className="truncate text-xs text-muted">{org.asaasAccountEmail}</p>
                  )}
                  {showProviderPicker && org.paymentProvider !== "ASAAS" && (
                    <button
                      type="button"
                      disabled={savingDefault}
                      onClick={() => setDefaultProvider("ASAAS")}
                      className="btn-primary w-full"
                    >
                      Usar como padrão
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={disconnectAsaas}
                    className="btn-secondary w-full text-danger"
                  >
                    Desconectar
                  </button>
                </div>
              ) : (
                <Link href="/app/integrations/asaas" className="btn-primary w-full">
                  Conectar
                </Link>
              )
            }
          />
        )}

        {CAKTO_ENABLED && (
          <IntegrationCard
            icon={
              <span className="text-lg font-bold tracking-tight text-emerald-600">C</span>
            }
            title="Cakto"
            status={
              org?.caktoConnected
                ? org.paymentProvider === "CAKTO"
                  ? "Padrão"
                  : "Conectado"
                : "Modo demo"
            }
            statusVariant={org?.caktoConnected ? "connected" : "demo"}
            description="Cobrança via Pix e cartão no checkout transparente do funil de agendamento."
            action={
              org?.caktoConnected ? (
                <div className="space-y-2">
                  {showProviderPicker && org.paymentProvider !== "CAKTO" && (
                    <button
                      type="button"
                      disabled={savingDefault}
                      onClick={() => setDefaultProvider("CAKTO")}
                      className="btn-primary w-full"
                    >
                      Usar como padrão
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={disconnectCakto}
                    className="btn-secondary w-full text-danger"
                  >
                    Desconectar
                  </button>
                </div>
              ) : (
                <Link href="/app/integrations/cakto" className="btn-primary w-full">
                  Conectar
                </Link>
              )
            }
          />
        )}
      </div>
    </div>
  );
}
