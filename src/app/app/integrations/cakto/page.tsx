"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CAKTO_ENABLED } from "@/lib/feature-flags";

type Org = {
  caktoClientId: string | null;
  caktoOfferId: string | null;
  hasCaktoSecret: boolean;
  caktoConnected: boolean;
  mercadoPagoConnected?: boolean;
};

export default function CaktoIntegrationPage() {
  const router = useRouter();
  const [org, setOrg] = useState<Org | null>(null);
  const [clientId, setClientId] = useState("");
  const [secret, setSecret] = useState("");
  const [offerId, setOfferId] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!CAKTO_ENABLED) {
      router.replace("/app/integrations");
      return;
    }
    fetch("/api/organization")
      .then((r) => r.json())
      .then((data: Org) => {
        setOrg(data);
        setClientId(data.caktoClientId || "");
        setOfferId(data.caktoOfferId || "");
      });
  }, [router]);

  if (!CAKTO_ENABLED) return null;

  async function save(e: React.FormEvent) {
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
        ...(!org?.mercadoPagoConnected ? { paymentProvider: "CAKTO" } : {}),
        ...(secret ? { caktoClientSecret: secret.trim() } : {}),
      }),
    });
    const data = await res.json();
    setOrg(data);
    setSecret("");
    setSaving(false);
    setMsg(data.caktoConnected ? "Cakto conectada" : "Salvo");
  }

  async function disconnect() {
    if (!confirm("Desconectar a Cakto?")) return;
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
    setOrg(await res.json());
    setClientId("");
    setOfferId("");
    setSaving(false);
    setMsg("Cakto desconectada");
  }

  if (!org) return <p className="text-sm text-muted">Carregando…</p>;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/app/integrations" className="text-sm text-muted hover:text-foreground">
        ← Integrações
      </Link>

      {msg && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {msg}
        </p>
      )}

      <form onSubmit={save} className="surface space-y-4 p-6">
        <h2 className="text-lg font-semibold">Pagamentos Cakto</h2>
        <ol className="space-y-1 text-xs text-muted">
          <li>
            1. Abra{" "}
            <a
              href="https://app.cakto.com.br/dashboard/cakto-api"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              app.cakto.com.br → API
            </a>
          </li>
          <li>2. Crie uma chave e copie Client ID + Secret</li>
          <li>3. Copie o ID da oferta do produto</li>
        </ol>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Client ID</span>
          <input
            className="input-field font-mono text-xs"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">
            Client Secret{" "}
            {org.hasCaktoSecret && (
              <span className="font-normal text-muted">· deixe vazio para manter</span>
            )}
          </span>
          <input
            type="password"
            className="input-field font-mono text-xs"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">ID da oferta</span>
          <input
            className="input-field font-mono text-xs"
            value={offerId}
            onChange={(e) => setOfferId(e.target.value)}
          />
        </label>

        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Salvando…" : "Salvar"}
          </button>
          {org.caktoConnected && (
            <button type="button" onClick={disconnect} className="btn-secondary text-danger">
              Desconectar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
