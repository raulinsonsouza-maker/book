"use client";

import { useEffect, useState } from "react";
import { formatPhoneDisplay } from "@/lib/utils";

export type CustomerPick = {
  id: string;
  name: string;
  phoneE164: string;
  email?: string | null;
  cpf?: string | null;
};

type Props = {
  value: CustomerPick | null;
  onChange: (customer: CustomerPick | null) => void;
  label?: string;
  placeholder?: string;
  locked?: boolean;
  className?: string;
};

export function CustomerPicker({
  value,
  onChange,
  label = "Cliente",
  placeholder = "Buscar por nome, telefone ou e-mail…",
  locked = false,
  className = "",
}: Props) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CustomerPick[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (locked || value) {
      setHits([]);
      return;
    }
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      fetch(`/api/clients?q=${encodeURIComponent(q)}&take=8`)
        .then(async (r) => {
          if (!r.ok) return;
          const data = await r.json();
          const list = (data.clients || data.customers || []) as CustomerPick[];
          setHits(
            list.map((c) => ({
              id: c.id,
              name: c.name,
              phoneE164: c.phoneE164,
              email: c.email ?? null,
              cpf: c.cpf ?? null,
            })),
          );
        })
        .catch(() => undefined)
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query, value, locked]);

  if (value) {
    return (
      <div className={className}>
        {label ? (
          <span className="mb-1.5 block text-sm font-medium">{label}</span>
        ) : null}
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted-bg/40 px-3 py-2 text-sm">
          <div className="min-w-0">
            <p className="truncate font-medium">{value.name}</p>
            <p className="truncate text-xs text-muted">
              {formatPhoneDisplay(value.phoneE164)}
              {value.email ? ` · ${value.email}` : ""}
            </p>
          </div>
          {!locked ? (
            <button
              type="button"
              className="shrink-0 text-xs font-medium text-muted underline-offset-2 hover:text-foreground hover:underline"
              onClick={() => {
                onChange(null);
                setQuery("");
              }}
            >
              Trocar
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {label ? (
        <span className="mb-1.5 block text-sm font-medium">{label}</span>
      ) : null}
      <input
        className="input-field"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        disabled={locked}
      />
      {searching ? (
        <p className="mt-1 text-xs text-muted">Buscando…</p>
      ) : null}
      {hits.length > 0 ? (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-border bg-white py-1 shadow-lg">
          {hits.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted-bg"
                onClick={() => {
                  onChange(c);
                  setQuery("");
                  setHits([]);
                }}
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-muted">
                  {formatPhoneDisplay(c.phoneE164)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
