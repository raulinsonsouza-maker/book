"use client";

import { useEffect, useState } from "react";
import { normalizeRules } from "@/lib/availability-core";

/** Ordem Brasil: seg → dom */
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const DAY_SHORT: Record<number, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};

const DAY_FULL: Record<number, string> = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
};

type Rule = { dayOfWeek: number; startTime: string; endTime: string };

type Props = {
  pageId?: string;
  professionalId?: string;
  /** Salva as mesmas regras em todos os profissionais ativos (salão). */
  applyToAllProfessionals?: boolean;
  initialRules: Rule[];
  onSaved?: (rules: Rule[]) => void;
  /** Edita localmente; o pai persiste depois (ex.: ao cadastrar). */
  deferred?: boolean;
  onChange?: (rules: Rule[]) => void;
};

function dayRules(rules: Rule[], day: number) {
  return rules.filter((r) => r.dayOfWeek === day);
}

function formatRange(windows: Rule[]) {
  if (!windows.length) return "Fechado";
  return windows.map((w) => `${w.startTime}–${w.endTime}`).join(" · ");
}

/** Opções 06:00–22:00 em passos de 30 min, formato 24h (Brasil). */
const TIME_OPTIONS_24H = (() => {
  const out: string[] = [];
  for (let h = 6; h <= 22; h++) {
    for (const m of [0, 30]) {
      if (h === 22 && m > 0) continue;
      out.push(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      );
    }
  }
  return out;
})();

function Time24Select({
  value,
  onChange,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  "aria-label"?: string;
}) {
  const normalized =
    value.length === 5 ? value : value.slice(0, 5);
  const options =
    TIME_OPTIONS_24H.includes(normalized)
      ? TIME_OPTIONS_24H
      : [...TIME_OPTIONS_24H, normalized].sort();

  return (
    <select
      aria-label={ariaLabel}
      className="input-field w-full !py-2 text-sm tabular-nums"
      value={normalized}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((t) => (
        <option key={t} value={t}>
          {t.replace(":", "h").replace(/h(\d+)$/, (_m, mm) =>
            mm === "00" ? "h" : `h${mm}`,
          )}
        </option>
      ))}
    </select>
  );
}

const PRESETS = [
  {
    id: "commercial",
    label: "Comercial",
    hint: "Seg–sex · 9–12 e 13–18",
    build: (): Rule[] =>
      [1, 2, 3, 4, 5].flatMap((dayOfWeek) => [
        { dayOfWeek, startTime: "09:00", endTime: "12:00" },
        { dayOfWeek, startTime: "13:00", endTime: "18:00" },
      ]),
  },
  {
    id: "morning",
    label: "Só manhã",
    hint: "Seg–sex · 8–12",
    build: (): Rule[] =>
      [1, 2, 3, 4, 5].map((dayOfWeek) => ({
        dayOfWeek,
        startTime: "08:00",
        endTime: "12:00",
      })),
  },
  {
    id: "full",
    label: "Dia corrido",
    hint: "Seg–sex · 9–18",
    build: (): Rule[] =>
      [1, 2, 3, 4, 5].map((dayOfWeek) => ({
        dayOfWeek,
        startTime: "09:00",
        endTime: "18:00",
      })),
  },
] as const;

export function WeekHoursSimple({
  pageId,
  professionalId,
  applyToAllProfessionals = false,
  initialRules,
  onSaved,
  deferred = false,
  onChange,
}: Props) {
  const [rules, setRules] = useState<Rule[]>(() => normalizeRules(initialRules));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [dirty, setDirty] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  useEffect(() => {
    if (deferred) return;
    setRules(normalizeRules(initialRules));
    setDirty(false);
  }, [initialRules, deferred]);

  function commitRules(next: Rule[]) {
    const normalized = normalizeRules(next);
    setRules(normalized);
    setDirty(true);
    if (deferred) onChange?.(normalized);
  }

  function applyPreset(build: () => Rule[]) {
    setExpandedDay(null);
    commitRules(build());
  }

  function setDayEnabled(day: number, enabled: boolean) {
    if (!enabled) {
      setExpandedDay((cur) => (cur === day ? null : cur));
      commitRules(rules.filter((r) => r.dayOfWeek !== day));
      return;
    }
    setExpandedDay(day);
    const without = rules.filter((r) => r.dayOfWeek !== day);
    commitRules([
      ...without,
      { dayOfWeek: day, startTime: "09:00", endTime: "18:00" },
    ]);
  }

  function updateWindow(
    day: number,
    index: number,
    field: "startTime" | "endTime",
    value: string,
  ) {
    const list = dayRules(rules, day);
    const target = list[index];
    if (!target) return;
    commitRules(rules.map((r) => (r === target ? { ...r, [field]: value } : r)));
  }

  function replaceDayWindows(
    day: number,
    nextWindows: { startTime: string; endTime: string }[],
  ) {
    commitRules([
      ...rules.filter((r) => r.dayOfWeek !== day),
      ...nextWindows.map((w) => ({ dayOfWeek: day, ...w })),
    ]);
  }

  function addLunchBreak(day: number) {
    const existing = dayRules(rules, day);
    if (existing.length >= 2) return;
    const first = existing[0];
    if (!first) {
      replaceDayWindows(day, [
        { startTime: "09:00", endTime: "12:00" },
        { startTime: "13:00", endTime: "18:00" },
      ]);
      return;
    }
    replaceDayWindows(day, [
      { startTime: first.startTime, endTime: "12:00" },
      { startTime: "13:00", endTime: first.endTime > "13:00" ? first.endTime : "18:00" },
    ]);
  }

  function removeWindow(day: number, index: number) {
    const list = dayRules(rules, day);
    const target = list[index];
    if (!target) return;
    const next = rules.filter((r) => r !== target);
    commitRules(next);
    if (!dayRules(next, day).length) {
      setExpandedDay((cur) => (cur === day ? null : cur));
    }
  }

  function copyDayToWeekdays(sourceDay: number) {
    const source = dayRules(rules, sourceDay);
    if (!source.length) return;
    const withoutWeekdays = rules.filter(
      (r) => r.dayOfWeek === 0 || r.dayOfWeek === 6,
    );
    const cloned = [1, 2, 3, 4, 5].flatMap((dayOfWeek) =>
      source.map((w) => ({
        dayOfWeek,
        startTime: w.startTime,
        endTime: w.endTime,
      })),
    );
    commitRules([...withoutWeekdays, ...cloned]);
    setMsg("Horário aplicado aos dias úteis");
    setTimeout(() => setMsg(""), 2000);
  }

  async function save() {
    setSaving(true);
    setMsg("");
    const normalized = normalizeRules(rules);
    const res = await fetch("/api/availability", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        applyToAllProfessionals
          ? { applyToAllProfessionals: true, rules: normalized }
          : professionalId
            ? { professionalId, rules: normalized }
            : { bookingPageId: pageId, rules: normalized },
      ),
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
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs text-muted">
          Comece por um modelo — depois ajuste só o que for diferente.
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.build)}
              title={p.hint}
              className="rounded-full border border-border bg-white px-3 py-1.5 text-left transition hover:border-foreground/25 hover:bg-muted-bg"
            >
              <span className="block text-xs font-semibold">{p.label}</span>
              <span className="block text-[10px] text-muted">{p.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border">
        {DAY_ORDER.map((day, i) => {
          const windows = dayRules(rules, day);
          const enabled = windows.length > 0;
          const expanded = expandedDay === day;
          const isWeekend = day === 0 || day === 6;

          return (
            <div
              key={day}
              className={`border-border ${i > 0 ? "border-t" : ""} ${
                enabled ? "bg-white" : "bg-muted-bg/35"
              }`}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label={`${DAY_FULL[day]} ${enabled ? "aberto" : "fechado"}`}
                  onClick={() => setDayEnabled(day, !enabled)}
                  className={`relative h-6 w-10 shrink-0 rounded-full transition ${
                    enabled ? "bg-foreground" : "bg-border"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                      enabled ? "left-[1.125rem]" : "left-0.5"
                    }`}
                  />
                </button>

                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    if (!enabled) {
                      setDayEnabled(day, true);
                      return;
                    }
                    setExpandedDay(expanded ? null : day);
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold tracking-tight">
                      {DAY_SHORT[day]}
                    </span>
                    <span className="text-xs text-muted">{DAY_FULL[day]}</span>
                    {isWeekend && (
                      <span className="rounded-md bg-muted-bg px-1.5 py-0.5 text-[10px] font-medium text-muted">
                        fim de semana
                      </span>
                    )}
                  </div>
                  <p
                    className={`mt-0.5 text-xs ${
                      enabled ? "font-medium text-foreground" : "text-muted"
                    }`}
                  >
                    {formatRange(windows)}
                  </p>
                </button>

                {enabled && (
                  <button
                    type="button"
                    className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-muted hover:bg-muted-bg hover:text-foreground"
                    onClick={() => setExpandedDay(expanded ? null : day)}
                  >
                    {expanded ? "Pronto" : "Editar"}
                  </button>
                )}
              </div>

              {enabled && expanded && (
                <div className="space-y-3 border-t border-border bg-muted-bg/20 px-4 py-3">
                  {windows.map((w, idx) => (
                    <div
                      key={`${day}-${idx}`}
                      className="flex flex-wrap items-end gap-2"
                    >
                      <label className="min-w-[7rem] flex-1">
                        <span className="mb-1 block text-xs text-muted">
                          {windows.length > 1
                            ? idx === 0
                              ? "Manhã — início"
                              : "Tarde — início"
                            : "Abre às"}
                        </span>
                        <Time24Select
                          aria-label="Horário de início"
                          value={w.startTime}
                          onChange={(v) =>
                            updateWindow(day, idx, "startTime", v)
                          }
                        />
                      </label>
                      <span className="pb-2.5 text-sm text-muted">até</span>
                      <label className="min-w-[7rem] flex-1">
                        <span className="mb-1 block text-xs text-muted">
                          {windows.length > 1
                            ? idx === 0
                              ? "fecha"
                              : "fecha"
                            : "Fecha às"}
                        </span>
                        <Time24Select
                          aria-label="Horário de fim"
                          value={w.endTime}
                          onChange={(v) =>
                            updateWindow(day, idx, "endTime", v)
                          }
                        />
                      </label>
                      {windows.length > 1 && (
                        <button
                          type="button"
                          className="mb-0.5 rounded-lg px-2 py-2 text-xs text-muted hover:bg-white hover:text-danger"
                          onClick={() => removeWindow(day, idx)}
                          aria-label="Remover intervalo"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  ))}

                  {windows.length < 2 && (
                    <button
                      type="button"
                      onClick={() => addLunchBreak(day)}
                      className="text-xs font-medium text-muted underline-offset-2 hover:text-foreground hover:underline"
                    >
                      + Separar manhã e tarde (pausa de almoço)
                    </button>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {!isWeekend && (
                      <button
                        type="button"
                        className="btn-secondary !py-1.5 !text-xs"
                        onClick={() => copyDayToWeekdays(day)}
                      >
                        Igual em seg–sex
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-primary !py-1.5 !text-xs"
                      onClick={() => setExpandedDay(null)}
                    >
                      Pronto
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(msg || !deferred) && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {msg && (
            <p
              className={`text-sm ${
                msg.includes("Não") ? "text-danger" : "text-emerald-700"
              }`}
            >
              {msg}
            </p>
          )}
          {!deferred && (
            <button
              type="button"
              disabled={saving || !dirty}
              onClick={() => void save()}
              className="btn-primary"
            >
              {saving ? "Salvando…" : dirty ? "Salvar horários" : "Salvo"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
