"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDays,
  addWeeks,
  format,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";

type Exception = {
  date: string;
  isBlocked: boolean;
  startTime?: string | null;
  endTime?: string | null;
};

type Props = {
  professionalId: string;
};

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function isFullDayBlock(ex: Exception | undefined) {
  return Boolean(ex?.isBlocked && !ex.startTime && !ex.endTime);
}

export function ProfessionalWeekBlocks({ professionalId }: Props) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 0 }),
  );
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const from = format(weekStart, "yyyy-MM-dd");
  const to = format(addDays(weekStart, 6), "yyyy-MM-dd");
  const weekEnd = addDays(weekStart, 6);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    fetch(
      `/api/availability/exceptions?professionalId=${professionalId}&from=${from}&to=${to}`,
    )
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          throw new Error(data.error || "Não foi possível carregar bloqueios");
        }
        const blocked = new Set<string>();
        for (const ex of data as Exception[]) {
          if (isFullDayBlock(ex)) blocked.add(ex.date);
        }
        setBlockedDates(blocked);
        setDirty(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Erro ao carregar");
        setBlockedDates(new Set());
      })
      .finally(() => setLoading(false));
  }, [professionalId, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  function toggleDay(dateStr: string) {
    setDirty(true);
    setBlockedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  }

  function blockEntireWeek() {
    setDirty(true);
    setBlockedDates(new Set(weekDays.map((d) => format(d, "yyyy-MM-dd"))));
  }

  function unblockEntireWeek() {
    setDirty(true);
    setBlockedDates(new Set());
  }

  async function save() {
    setSaving(true);
    setMsg("");
    setError("");

    const exceptions: Exception[] = weekDays
      .map((d) => format(d, "yyyy-MM-dd"))
      .filter((date) => blockedDates.has(date))
      .map((date) => ({
        date,
        isBlocked: true,
        startTime: null,
        endTime: null,
      }));

    const res = await fetch("/api/availability/exceptions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        professionalId,
        weekFrom: from,
        weekTo: to,
        exceptions,
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || "Não foi possível salvar os bloqueios");
      return;
    }

    setDirty(false);
    setMsg("Bloqueios salvos — estes dias não aparecem disponíveis para você");
    setTimeout(() => setMsg(""), 3000);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-secondary !px-2.5 !py-1.5"
          onClick={() => setWeekStart(subWeeks(weekStart, 1))}
          aria-label="Semana anterior"
        >
          ←
        </button>
        <button
          type="button"
          className="btn-secondary !py-1.5"
          onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))}
        >
          Esta semana
        </button>
        <button
          type="button"
          className="btn-secondary !px-2.5 !py-1.5"
          onClick={() => setWeekStart(addWeeks(weekStart, 1))}
          aria-label="Próxima semana"
        >
          →
        </button>
        <span className="text-sm font-semibold capitalize">
          {format(weekStart, "d MMM", { locale: ptBR })} –{" "}
          {format(weekEnd, "d MMM yyyy", { locale: ptBR })}
        </span>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted">Carregando bloqueios…</p>
      ) : (
        <div className="space-y-2">
          {weekDays.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const blocked = blockedDates.has(dateStr);
            const isPast = day < new Date(new Date().toDateString());
            return (
              <label
                key={dateStr}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-3 ${
                  blocked
                    ? "border-red-200 bg-red-50"
                    : "border-border bg-white"
                } ${isPast ? "opacity-70" : ""}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {DAY_LABELS[day.getDay()]} ·{" "}
                    {format(day, "d 'de' MMMM", { locale: ptBR })}
                  </p>
                  <p className="text-xs text-muted">
                    {blocked
                      ? "Bloqueado — clientes não veem horários neste dia"
                      : "Disponível conforme sua grade semanal"}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={blocked}
                  disabled={isPast}
                  onChange={() => toggleDay(dateStr)}
                  className="h-4 w-4 accent-red-600"
                  aria-label={`Bloquear ${format(day, "dd/MM")}`}
                />
              </label>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary !text-xs"
          onClick={blockEntireWeek}
          disabled={loading}
        >
          Bloquear semana inteira
        </button>
        <button
          type="button"
          className="btn-secondary !text-xs"
          onClick={unblockEntireWeek}
          disabled={loading}
        >
          Desbloquear semana
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-primary"
          disabled={saving || loading || !dirty}
          onClick={save}
        >
          {saving ? "Salvando…" : dirty ? "Salvar bloqueios" : "Bloqueios salvos"}
        </button>
        {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      </div>
    </div>
  );
}
