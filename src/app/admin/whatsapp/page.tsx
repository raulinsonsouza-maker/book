"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type WaPayload = {
  config: {
    enabled: boolean;
    phoneNumberId: string | null;
    wabaId: string | null;
    displayNumber: string | null;
    templateOtpName: string;
    templateReminderName: string;
    templateConfirmName: string | null;
    webhookVerifyToken: string | null;
    defaultButtonBaseUrl: string | null;
    lastError: string | null;
    lastTestAt: string | null;
    hasToken: boolean;
    tokenMasked: string | null;
  };
  runtime: { ready: boolean };
  stats: {
    today: number;
    month: number;
    topTenants: { organizationId: string | null; count: number; name: string; slug: string | null }[];
    recentFails: {
      id: string;
      templateName: string;
      toPhoneE164: string;
      error: string | null;
      createdAt: string;
      organization: { name: string } | null;
    }[];
  };
};

export default function AdminWhatsAppPage() {
  const [data, setData] = useState<WaPayload | null>(null);
  const [token, setToken] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/whatsapp");
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(patch: Record<string, unknown>) {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/admin/whatsapp", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setBusy(false);
    if (!res.ok) {
      setMsg("Erro ao salvar");
      return;
    }
    setToken("");
    setMsg("Salvo");
    await load();
  }

  async function testSend(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/admin/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: testPhone }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok || !d.ok) {
      setMsg(d.error || "Falha no teste");
      await load();
      return;
    }
    setMsg(
      d.debugCode
        ? `Teste enviado (dev code: ${d.debugCode})`
        : "Teste enviado",
    );
    await load();
  }

  if (!data) return <p className="text-sm text-muted">Carregando…</p>;

  const c = data.config;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="surface flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="text-sm text-muted">Canal único da plataforma</p>
          <p className="mt-1 text-lg font-semibold">
            {data.runtime.ready && c.enabled
              ? "Pronto para enviar"
              : c.enabled
                ? "Incompleto — confira token e Phone Number ID"
                : "Desligado"}
          </p>
          {c.lastError && (
            <p className="mt-2 text-sm text-danger">Último erro: {c.lastError}</p>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={c.enabled}
            disabled={busy}
            onChange={(e) => void save({ enabled: e.target.checked })}
          />
          Kill-switch (enabled)
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="surface p-4">
          <p className="text-xs text-muted">Hoje</p>
          <p className="text-2xl font-semibold">{data.stats.today}</p>
        </div>
        <div className="surface p-4">
          <p className="text-xs text-muted">Este mês</p>
          <p className="text-2xl font-semibold">{data.stats.month}</p>
        </div>
        <div className="surface p-4">
          <Link href="/admin/mensagens" className="text-sm font-medium underline">
            Ver logs →
          </Link>
        </div>
      </div>

      <form
        className="surface space-y-3 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void save({
            phoneNumberId: String(fd.get("phoneNumberId") || "") || null,
            wabaId: String(fd.get("wabaId") || "") || null,
            displayNumber: String(fd.get("displayNumber") || "") || null,
            templateOtpName: String(fd.get("templateOtpName") || "book_auth_otp"),
            templateReminderName: String(
              fd.get("templateReminderName") || "book_booking_reminder",
            ),
            templateConfirmName: String(fd.get("templateConfirmName") || "") || null,
            webhookVerifyToken: String(fd.get("webhookVerifyToken") || "") || null,
            defaultButtonBaseUrl:
              String(fd.get("defaultButtonBaseUrl") || "") || null,
            ...(token.trim() ? { accessToken: token.trim() } : {}),
          });
        }}
      >
        <h2 className="font-semibold">Credenciais Meta Cloud API</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Phone Number ID
            <input
              name="phoneNumberId"
              className="input-field mt-1"
              defaultValue={c.phoneNumberId || ""}
            />
          </label>
          <label className="text-sm">
            WABA ID
            <input
              name="wabaId"
              className="input-field mt-1"
              defaultValue={c.wabaId || ""}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Access token{" "}
            {c.tokenMasked && (
              <span className="text-muted">({c.tokenMasked})</span>
            )}
            <input
              className="input-field mt-1"
              type="password"
              placeholder={c.hasToken ? "Deixe vazio para manter" : "Cole o token"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="text-sm">
            Número exibido
            <input
              name="displayNumber"
              className="input-field mt-1"
              defaultValue={c.displayNumber || ""}
            />
          </label>
          <label className="text-sm">
            Base URL botão
            <input
              name="defaultButtonBaseUrl"
              className="input-field mt-1"
              placeholder="https://book.symbius.com.br"
              defaultValue={c.defaultButtonBaseUrl || ""}
            />
          </label>
          <label className="text-sm">
            Template OTP
            <input
              name="templateOtpName"
              className="input-field mt-1"
              defaultValue={c.templateOtpName}
            />
          </label>
          <label className="text-sm">
            Template lembrete
            <input
              name="templateReminderName"
              className="input-field mt-1"
              defaultValue={c.templateReminderName}
            />
          </label>
          <label className="text-sm">
            Template confirmação (opc.)
            <input
              name="templateConfirmName"
              className="input-field mt-1"
              defaultValue={c.templateConfirmName || ""}
            />
          </label>
          <label className="text-sm">
            Webhook verify token
            <input
              name="webhookVerifyToken"
              className="input-field mt-1"
              defaultValue={c.webhookVerifyToken || ""}
            />
          </label>
        </div>
        <button type="submit" className="btn-primary" disabled={busy}>
          Salvar
        </button>
      </form>

      <form onSubmit={(e) => void testSend(e)} className="surface space-y-3 p-5">
        <h2 className="font-semibold">Teste de envio (OTP)</h2>
        <input
          className="input-field"
          placeholder="Celular com DDD"
          value={testPhone}
          onChange={(e) => setTestPhone(e.target.value)}
          required
        />
        <button type="submit" className="btn-secondary" disabled={busy}>
          Enviar teste
        </button>
        {c.lastTestAt && (
          <p className="text-xs text-muted">
            Último teste: {new Date(c.lastTestAt).toLocaleString("pt-BR")}
          </p>
        )}
      </form>

      {data.stats.topTenants.length > 0 && (
        <div className="surface p-5">
          <h2 className="mb-3 font-semibold">Top tenants (mês)</h2>
          <ul className="space-y-1 text-sm">
            {data.stats.topTenants.map((t) => (
              <li key={t.organizationId || t.name} className="flex justify-between">
                <span>{t.name}</span>
                <span className="tabular-nums">{t.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {msg && <p className="text-sm text-muted">{msg}</p>}
    </div>
  );
}
