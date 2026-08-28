"use client";

import { useEffect, useState } from "react";
import {
  GoogleCalendarIcon,
  GoogleGIcon,
} from "@/components/icons/GoogleCalendarIcon";

type Org = {
  name: string;
  slug: string;
  timezone: string;
  caktoClientId: string | null;
  caktoOfferId: string | null;
  hasCaktoSecret: boolean;
  caktoConnected: boolean;
};

type GoogleStatus = {
  configured: boolean;
  connected: boolean;
  email: string | null;
  calendarId: string | null;
};

export default function SettingsPage() {
  const [org, setOrg] = useState<Org | null>(null);
  const [google, setGoogle] = useState<GoogleStatus | null>(null);
  const [clientId, setClientId] = useState("");
  const [secret, setSecret] = useState("");
  const [offerId, setOfferId] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingOrg, setSavingOrg] = useState(false);

  useEffect(() => {
    fetch("/api/organization")
      .then((r) => r.json())
      .then((data: Org) => {
        setOrg(data);
        setName(data.name);
        setClientId(data.caktoClientId || "");
        setOfferId(data.caktoOfferId || "");
      });
    fetch("/api/google/status")
      .then((r) => r.json())
      .then(setGoogle);

    const g = new URLSearchParams(window.location.search).get("google");
    if (g === "connected") {
      setMsg("Google Agenda conectada com sucesso");
      fetch("/api/google/status")
        .then((r) => r.json())
        .then(setGoogle);
    } else if (g === "missing_env") {
      setMsg(
        "Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no .env e reinicie o servidor",
      );
    } else if (g === "error" || g === "forbidden") {
      setMsg("Não foi possível conectar o Google Agenda. Tente de novo.");
    }
  }, []);

  async function saveOrg(e: React.FormEvent) {
    e.preventDefault();
    setSavingOrg(true);
    const res = await fetch("/api/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setOrg(data);
    setSavingOrg(false);
    setMsg("Dados salvos");
    setTimeout(() => setMsg(""), 2000);
  }

  async function saveCakto(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId.trim() || !offerId.trim()) {
      setMsg("Preencha Client ID e ID da oferta");
      return;
    }
    if (!secret && !org?.hasCaktoSecret) {
      setMsg("Cole o Client Secret");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caktoClientId: clientId.trim(),
        caktoOfferId: offerId.trim(),
        caktoSdkClientId: clientId.trim(),
        ...(secret ? { caktoClientSecret: secret.trim() } : {}),
      }),
    });
    const data = await res.json();
    setOrg(data);
    setSecret("");
    setSaving(false);
    setMsg(
      data.caktoConnected
        ? "Cakto conectada — você já pode receber pagamentos"
        : "Salvo, mas ainda falta o secret",
    );
    setTimeout(() => setMsg(""), 3000);
  }

  async function disconnect() {
    if (!confirm("Desconectar a Cakto? O checkout volta para modo demo.")) return;
    setSaving(true);
    const res = await fetch("/api/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caktoClientId: null,
        caktoClientSecret: null,
        caktoSdkClientId: null,
        caktoOfferId: null,
      }),
    });
    const data = await res.json();
    setOrg(data);
    setClientId("");
    setOfferId("");
    setSecret("");
    setSaving(false);
    setMsg("Cakto desconectada");
    setTimeout(() => setMsg(""), 2000);
  }

  async function disconnectGoogle() {
    if (!confirm("Desconectar o Google Agenda?")) return;
    await fetch("/api/google/status", { method: "DELETE" });
    setGoogle((g) =>
      g
        ? { ...g, connected: false, email: null }
        : { configured: false, connected: false, email: null, calendarId: null },
    );
    setMsg("Google Agenda desconectada");
    setTimeout(() => setMsg(""), 2000);
  }

  if (!org) return <p className="text-sm text-muted">Carregando…</p>;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="eyebrow">Conta</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
          Configurações
        </h1>
      </div>

      {msg && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {msg}
        </p>
      )}

      <section className="surface overflow-hidden">
        <div className="border-b border-[#4285F4]/20 bg-gradient-to-r from-[#4285F4]/10 via-[#34A853]/5 to-[#FBBC04]/10 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/80 bg-white shadow-sm">
                <GoogleCalendarIcon size={32} />
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-tight text-[#1a73e8]">
                  Google Agenda
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Reservas confirmadas entram na sua agenda. Horários ocupados no
                  Google ficam bloqueados no funil.
                </p>
              </div>
            </div>
            <span
              className={`tag shrink-0 ${
                google?.connected
                  ? "!border !border-[#34A853]/30 !bg-[#e8f5e9] !text-[#1e8e3e]"
                  : "!border !border-[#FBBC04]/40 !bg-[#fef7e0] !text-[#b06000]"
              }`}
            >
              {google?.connected ? "Conectada" : "Desconectada"}
            </span>
          </div>
        </div>

        <div className="space-y-4 p-5">
          {google?.connected ? (
            <>
              <div className="flex items-center gap-3 rounded-xl border border-[#4285F4]/25 bg-gradient-to-br from-[#4285F4]/5 to-[#34A853]/5 px-4 py-3">
                <GoogleCalendarIcon size={36} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-[#1a73e8]">
                    Conta vinculada
                  </p>
                  <p className="truncate text-sm font-medium text-foreground">
                    {google.email}
                  </p>
                </div>
              </div>
              <ul className="space-y-2 text-xs text-muted">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4285F4]" />
                  Novo agendamento pago → evento criado no Google
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#34A853]" />
                  Cancelamento → evento removido
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FBBC04]" />
                  Free/busy do Google bloqueia slots no funil
                </li>
              </ul>
              <button
                type="button"
                onClick={disconnectGoogle}
                className="btn-secondary text-danger"
              >
                Desconectar Google
              </button>
            </>
          ) : (
            <>
              {!google?.configured && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Falta configurar no <code>.env</code>:{" "}
                  <strong>GOOGLE_CLIENT_ID</strong> e{" "}
                  <strong>GOOGLE_CLIENT_SECRET</strong> (Google Cloud Console →
                  OAuth). Redirect:{" "}
                  <code className="break-all">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/api/google/callback`
                      : "/api/google/callback"}
                  </code>
                </p>
              )}
              <a
                href="/api/google/connect"
                className="inline-flex items-center gap-2.5 rounded-lg border border-[#dadce0] bg-white px-4 py-2.5 text-sm font-medium text-[#3c4043] shadow-sm transition hover:bg-[#f8f9fa] hover:shadow"
              >
                <GoogleGIcon size={20} />
                Conectar Google Agenda
              </a>
            </>
          )}
        </div>
      </section>

      <section className="surface overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-border bg-muted-bg/50 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Pagamentos Cakto
            </h2>
            <p className="mt-1 text-sm text-muted">
              3 campos. Cole o que está no painel da Cakto e pronto.
            </p>
          </div>
          <span
            className={`tag shrink-0 ${
              org.caktoConnected
                ? "!bg-emerald-50 !text-emerald-700"
                : "!bg-amber-50 !text-amber-800"
            }`}
          >
            {org.caktoConnected ? "Conectada" : "Modo demo"}
          </span>
        </div>

        <form onSubmit={saveCakto} className="space-y-4 p-5">
          <ol className="space-y-1 text-xs text-muted">
            <li>
              1. Abra{" "}
              <a
                href="https://app.cakto.com.br/dashboard/cakto-api"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                app.cakto.com.br → API
              </a>
            </li>
            <li>2. Crie uma chave e copie Client ID + Secret</li>
            <li>3. Copie o ID da oferta do produto que quer vender</li>
          </ol>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Client ID</span>
            <input
              className="input-field font-mono text-xs"
              placeholder="Cole aqui"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              autoComplete="off"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">
              Client Secret{" "}
              {org.hasCaktoSecret && (
                <span className="font-normal text-muted">
                  · já salvo, deixe vazio para manter
                </span>
              )}
            </span>
            <input
              type="password"
              className="input-field font-mono text-xs"
              placeholder={org.hasCaktoSecret ? "••••••••••••" : "Cole aqui"}
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              autoComplete="off"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">
              ID da oferta (produto)
            </span>
            <input
              className="input-field font-mono text-xs"
              placeholder="Ex.: 77BcHrY"
              value={offerId}
              onChange={(e) => setOfferId(e.target.value)}
              autoComplete="off"
            />
          </label>

          <div className="flex flex-wrap gap-2 pt-1">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving
                ? "Salvando…"
                : org.caktoConnected
                  ? "Atualizar Cakto"
                  : "Conectar Cakto"}
            </button>
            {org.caktoConnected && (
              <button
                type="button"
                onClick={disconnect}
                className="btn-secondary text-danger"
              >
                Desconectar
              </button>
            )}
          </div>
        </form>
      </section>

      <form onSubmit={saveOrg} className="surface space-y-4 p-5">
        <h2 className="text-sm font-semibold tracking-tight">Organização</h2>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Nome</span>
          <input
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button type="submit" disabled={savingOrg} className="btn-secondary">
          {savingOrg ? "Salvando…" : "Salvar organização"}
        </button>
      </form>
    </div>
  );
}
