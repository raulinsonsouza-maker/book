"use client";

import { useEffect, useState } from "react";
import { normalizeRules } from "@/lib/availability-core";

const DAY_LABELS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

type Rule = { dayOfWeek: number; startTime: string; endTime: string };

type Props = {
  pageId: string;
  initialRules: Rule[];
  onSaved?: (rules: Rule[]) => void;
};

function dayRules(rules: Rule[], day: number) {
  return rules.filter((r) => r.dayOfWeek === day);
}

export function WeekHoursSimple({ pageId, initialRules, onSaved }: Props) {
  const [rules, setRules] = useState<Rule[]>(() => normalizeRules(initialRules));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setRules(normalizeRules(initialRules));
    setDirty(false);
  }, [initialRules]);

  function setDayEnabled(day: number, enabled: boolean) {
    setDirty(true);
    setRules((prev) => {
      const without = prev.filter((r) => r.dayOfWeek !== day);
      if (!enabled) return without;
      return normalizeRules([
        ...without,
        { dayOfWeek: day, startTime: "09:00", endTime: "18:00" },
      ]);
    });
  }

  function updateWindow(
    day: number,
    index: number,
    field: "startTime" | "endTime",
    value: string,
  ) {
    setDirty(true);
    const list = dayRules(rules, day);
    const target = list[index];
    if (!target) return;
    setRules((prev) =>
      prev.map((r) => (r === target ? { ...r, [field]: value } : r)),
    );
  }

  function addWindow(day: number) {
    setDirty(true);
    setRules((prev) =>
      normalizeRules([
        ...prev,
        { dayOfWeek: day, startTime: "14:00", endTime: "18:00" },
      ]),
    );
  }

  function removeWindow(day: number, index: number) {
    setDirty(true);
    const list = dayRules(rules, day);
    const target = list[index];
    if (!target) return;
    setRules((prev) => prev.filter((r) => r !== target));
  }

  async function save() {
    setSaving(true);
    setMsg("");
    const normalized = normalizeRules(rules);
    const res = await fetch("/api/availability", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingPageId: pageId, rules: normalized }),
    });
    setSaving(false);
    if (!res.ok) {
      setMsg("Não foi possível salvar os horários");
      return;
    }
    const saved = normalizeRules(await res.json());
    setRules(saved);
    setDirty(false);
    setMsg("Horários salvos");
    onSaved?.(saved);
    setTimeout(() => setMsg(""), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {DAY_LABELS.map((label, day) => {
          const windows = dayRules(rules, day);
          const enabled = windows.length > 0;
          return (
            <div
              key={day}
              className={`rounded-xl border px-3 py-3 ${
                enabled ? "border-border bg-white" : "border-border/70 bg-muted-bg/40"
              }`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex min-w-[7.5rem] items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setDayEnabled(day, e.target.checked)}
                  />
                  {label}
                </label>

                {enabled ? (
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    {windows.map((w, idx) => (
                      <div key={`${day}-${idx}`} className="flex flex-wrap items-center gap-2">
                        <input
                          type="time"
                          className="input-field !w-auto"
                          value={w.startTime}
                          onChange={(e) =>
                            updateWindow(day, idx, "startTime", e.target.value)
                          }
                        />
                        <span className="text-xs text-muted">até</span>
                        <input
                          type="time"
                          className="input-field !w-auto"
                          value={w.endTime}
                          onChange={(e) =>
                            updateWindow(day, idx, "endTime", e.target.value)
                          }
                        />
                        {windows.length > 1 && (
                          <button
                            type="button"
                            className="text-xs text-danger"
                            onClick={() => removeWindow(day, idx)}
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    ))}
                    {windows.length < 2 && (
                      <button
                        type="button"
                        className="self-start text-xs font-medium text-muted hover:text-foreground"
                        onClick={() => addWindow(day)}
                      >
                        + Intervalo (ex.: tarde)
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted">Fechado</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={saving || !dirty}
          onClick={save}
          className="btn-primary"
        >
          {saving ? "Salvando…" : dirty ? "Salvar horários" : "Horários salvos"}
        </button>
        {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      </div>
    </div>
  );
}
