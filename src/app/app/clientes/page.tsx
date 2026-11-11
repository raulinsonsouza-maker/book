"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type ClientRow = {
  id: string;
  name: string;
  phoneE164: string;
  email: string | null;
  bookingsCount: number;
  lastVisit: {
    startAt: string;
    status: string;
    serviceTitle: string;
  } | null;
  nextVisit: {
    startAt: string;
    serviceTitle: string;
  } | null;
  spentCents: number;
};

type ProfileLabels = {
  clientNoun: string;
  clientNounPlural: string;
  chartNoun: string;
  visitNoun: string;
};

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function fmtWhen(iso: string) {
  try {
    return format(parseISO(iso), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return iso;
  }
}

export default function ClientesPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [profile, setProfile] = useState<ProfileLabels>({
    clientNoun: "Cliente",
    clientNounPlural: "Clientes",
    chartNoun: "Prontuário",
    visitNoun: "Atendimento",
  });
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
  });

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q), 280);
    return () => window.clearTimeout(t);
  }, [q]);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (debouncedQ) params.set("q", debouncedQ);
    fetch(`/api/clients?${params}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error || "Não foi possível carregar");
          setClients([]);
          return;
        }
        if (data.profile) setProfile(data.profile);
        setClients(data.clients || []);
      })
      .catch(() => {
        setError("Falha de rede");
        setClients([]);
      })
      .finally(() => setLoading(false));
  }, [debouncedQ]);

  useEffect(() => {
    load();
  }, [load]);

  async function createClient(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email || null,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível salvar");
        return;
      }
      setShowCreate(false);
      setForm({ name: "", phone: "", email: "", notes: "" });
      window.location.href = `/app/clientes/${data.id}`;
    } catch {
      setError("Falha de rede ao salvar");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {profile.clientNounPlural}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Busque, cadastre e abra o {profile.chartNoun.toLowerCase()}.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setShowCreate((v) => !v)}
        >
          Novo {profile.clientNoun.toLowerCase()}
        </button>
      </div>

      {showCreate ? (
        <form
          onSubmit={createClient}
          className="rounded-2xl border border-border bg-white p-5 shadow-sm"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Nome</span>
              <input
                className="input-field"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Telefone</span>
              <input
                className="input-field"
                required
                placeholder="11999999999"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">E-mail</span>
              <input
                className="input-field"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium">Observações</span>
              <textarea
                className="input-field min-h-[72px]"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? "Salvando…" : "Salvar"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowCreate(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          className="input-field max-w-md"
          placeholder={`Buscar nome, telefone ou e-mail`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-sm text-muted">Carregando…</p>
        ) : clients.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-foreground">
              Nenhum {profile.clientNoun.toLowerCase()} ainda
            </p>
            <p className="mt-1 text-sm text-muted">
              Cadastre manualmente ou aguarde o primeiro {profile.visitNoun.toLowerCase()}.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {clients.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/app/clientes/${c.id}`}
                  className="flex flex-wrap items-center gap-4 px-4 py-3.5 transition hover:bg-[#faf8f5] sm:px-5"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1a1a1a] text-xs font-semibold text-white"
                    aria-hidden
                  >
                    {initials(c.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium tracking-tight text-foreground">
                      {c.name}
                    </p>
                    <p className="text-sm text-muted">
                      {c.phoneE164}
                      {c.email ? ` · ${c.email}` : ""}
                    </p>
                  </div>
                  <div className="hidden min-w-[9rem] text-sm text-muted md:block">
                    {c.lastVisit ? (
                      <>
                        <p className="text-foreground/80">Última visita</p>
                        <p>{fmtWhen(c.lastVisit.startAt)}</p>
                      </>
                    ) : (
                      <p>—</p>
                    )}
                  </div>
                  <div className="hidden min-w-[9rem] text-sm text-muted lg:block">
                    {c.nextVisit ? (
                      <>
                        <p className="text-foreground/80">Próximo</p>
                        <p>{fmtWhen(c.nextVisit.startAt)}</p>
                      </>
                    ) : (
                      <p>Sem próximo</p>
                    )}
                  </div>
                  <div className="text-right text-sm tabular-nums">
                    <p className="font-medium text-foreground">
                      {money(c.spentCents)}
                    </p>
                    <p className="text-muted">
                      {c.bookingsCount}{" "}
                      {c.bookingsCount === 1
                        ? profile.visitNoun.toLowerCase()
                        : `${profile.visitNoun.toLowerCase()}s`}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
