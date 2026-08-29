"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format, addDays, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { computeTheoreticalSlots, normalizeRules } from "@/lib/availability-core";
import { timezoneLabel } from "@/lib/utils";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
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
type Service = {
  id: string;
  title: string;
  durationMinutes: number;
  bufferBefore?: number;
  bufferAfter?: number;
};
type Exception = {
  id?: string;
  date: string;
  isBlocked: boolean;
  startTime?: string | null;
  endTime?: string | null;
};

type PreviewData = {
  windows: { start: string; end: string; slots: string[]; count: number }[];
  total: number;
};

type Props = {
  pageId: string;
  pageTitle: string;
  timezone: string;
  slotStepMinutes?: number;
  initialRules: Rule[];
  initialExceptions: Exception[];
  services: Service[];
};

function rulesForDay(rules: Rule[], dayOfWeek: number) {
  return rules.filter((r) => r.dayOfWeek === dayOfWeek);
}

export function AvailabilityEditor({
  pageId,
  pageTitle,
  timezone,
  slotStepMinutes = 0,
  initialRules,
  initialExceptions,
  services,
}: Props) {
  const [rules, setRules] = useState<Rule[]>(() => normalizeRules(initialRules));
  const [exceptions, setExceptions] = useState<Exception[]>(initialExceptions);
  const [serviceId, setServiceId] = useState(services[0]?.id || "");
  const [selectedDay, setSelectedDay] = useState(2);
  const [previewDate, setPreviewDate] = useState("");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [availableCount, setAvailableCount] = useState<number | null>(null);
  const [rulesSaved, setRulesSaved] = useState(true);
  const [exceptionDate, setExceptionDate] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const nextDateForDay = useCallback(
    (dayOfWeek: number) => {
      const start = startOfWeek(new Date(), { weekStartsOn: 0 });
      for (let i = 0; i < 14; i++) {
        const d = addDays(start, i);
        if (d.getDay() === dayOfWeek) {
          return format(d, "yyyy-MM-dd");
        }
      }
      return format(new Date(), "yyyy-MM-dd");
    },
    [],
  );

  useEffect(() => {
    const d = nextDateForDay(selectedDay);
    setPreviewDate(d);
  }, [selectedDay, nextDateForDay]);

  useEffect(() => {
    if (!serviceId || !previewDate) return;
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return;

    const theoretical = computeTheoreticalSlots({
      rules,
      exceptions,
      date: previewDate,
      timezone,
      durationMinutes: svc.durationMinutes,
      bufferBefore: svc.bufferBefore || 0,
      bufferAfter: svc.bufferAfter || 0,
      slotStepMinutes,
      skipPast: false,
    });

    setPreview({
      windows: theoretical.windows,
      total: theoretical.total,
    });
  }, [rules, exceptions, previewDate, serviceId, services, timezone, slotStepMinutes]);

  useEffect(() => {
    if (!serviceId || !previewDate || !rulesSaved) {
      setAvailableCount(null);
      return;
    }
    fetch(
      `/api/availability/preview?bookingPageId=${pageId}&serviceId=${serviceId}&date=${previewDate}`,
    )
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.availableCount === "number") {
          setAvailableCount(data.availableCount);
        }
      })
      .catch(() => setAvailableCount(null));
  }, [pageId, serviceId, previewDate, rulesSaved]);

  function addWindow(dayOfWeek: number) {
    setRulesSaved(false);
    setRules((prev) => [
      ...prev,
      { dayOfWeek, startTime: "08:00", endTime: "12:00" },
    ]);
  }

  function updateWindow(
    dayOfWeek: number,
    index: number,
    field: "startTime" | "endTime",
    value: string,
  ) {
    setRulesSaved(false);
    const dayRules = rulesForDay(rules, dayOfWeek);
    const globalIdx = rules.indexOf(dayRules[index]);
    setRules((prev) =>
      prev.map((r, i) => (i === globalIdx ? { ...r, [field]: value } : r)),
    );
  }

  function removeWindow(dayOfWeek: number, index: number) {
    setRulesSaved(false);
    const dayRules = rulesForDay(rules, dayOfWeek);
    const target = dayRules[index];
    setRules((prev) => prev.filter((r) => r !== target));
  }

  async function saveRules() {
    setSaving(true);
    const normalized = normalizeRules(rules);
    const res = await fetch("/api/availability", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingPageId: pageId, rules: normalized }),
    });
    setSaving(false);
    if (res.ok) {
      const saved = await res.json();
      setRules(normalizeRules(saved));
      setRulesSaved(true);
      setAvailableCount(null);
      setMsg("Disponibilidade salva");
      setTimeout(() => setMsg(""), 2000);
    } else setMsg("Erro ao salvar");
  }

  async function addException(blocked: boolean) {
    if (!exceptionDate) return;
    const next = [
      ...exceptions.filter((e) => e.date !== exceptionDate),
      {
        date: exceptionDate,
        isBlocked: blocked,
        startTime: blocked ? null : undefined,
        endTime: blocked ? null : undefined,
      },
    ];
    setExceptions(next);
    await fetch("/api/availability/exceptions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingPageId: pageId, exceptions: next }),
    });
    setMsg(blocked ? "Dia bloqueado" : "Exceção salva");
    setTimeout(() => setMsg(""), 2000);
  }

  const service = services.find((s) => s.id === serviceId);
  const dayRules = rulesForDay(rules, selectedDay);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/app/pages/${pageId}`}
          className="text-sm text-muted hover:text-foreground"
        >
          ← Voltar para {pageTitle}
        </Link>
        <p className="mt-3 text-sm text-muted">
          Opções avançadas: vários períodos por dia, feriados e preview dos
          slots. A configuração básica fica na tela da agenda. Fuso:{" "}
          {timezoneLabel(timezone)} (automático)
        </p>
      </div>

      {msg && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {msg}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="surface space-y-4 p-5 lg:col-span-2">
          <h2 className="font-semibold tracking-tight">Grade semanal</h2>
          <div className="flex flex-wrap gap-2">
            {DAY_LABELS.map((label, dayOfWeek) => {
              const count = rulesForDay(rules, dayOfWeek).length;
              return (
                <button
                  key={dayOfWeek}
                  type="button"
                  onClick={() => setSelectedDay(dayOfWeek)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    selectedDay === dayOfWeek
                      ? "border-foreground bg-foreground text-white"
                      : "border-border bg-white text-muted hover:text-foreground"
                  }`}
                >
                  {DAYS[dayOfWeek]}
                  {count > 0 && (
                    <span className="ml-1.5 text-xs opacity-80">({count})</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-muted-bg/30 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{DAY_LABELS[selectedDay]}</h3>
              <button
                type="button"
                onClick={() => addWindow(selectedDay)}
                className="btn-secondary !py-1 !text-xs"
              >
                + Período
              </button>
            </div>
            {dayRules.length === 0 ? (
              <p className="text-sm text-muted">Nenhum período — dia fechado.</p>
            ) : (
              dayRules.map((rule, idx) => (
                <div
                  key={`${selectedDay}-${idx}`}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-white p-3"
                >
                  <input
                    type="time"
                    value={rule.startTime}
                    onChange={(e) =>
                      updateWindow(selectedDay, idx, "startTime", e.target.value)
                    }
                    className="rounded-lg border border-border px-2 py-1 text-sm"
                  />
                  <span className="text-muted">até</span>
                  <input
                    type="time"
                    value={rule.endTime}
                    onChange={(e) =>
                      updateWindow(selectedDay, idx, "endTime", e.target.value)
                    }
                    className="rounded-lg border border-border px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeWindow(selectedDay, idx)}
                    className="ml-auto text-xs text-danger hover:underline"
                  >
                    Remover
                  </button>
                </div>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={saveRules}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? "Salvando…" : "Salvar disponibilidade"}
          </button>
          {!rulesSaved && (
            <p className="text-xs text-amber-800">
              Você tem alterações não salvas. Salve para aplicar no funil público.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="surface space-y-4 p-5">
            <h2 className="font-semibold tracking-tight">Simulação de slots</h2>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Serviço de referência</span>
              <select
                className="input-field"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.durationMinutes} min)
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Data de preview</span>
              <input
                type="date"
                className="input-field"
                value={previewDate}
                onChange={(e) => setPreviewDate(e.target.value)}
              />
            </label>
            {preview && service && (
              <>
                <p className="text-sm leading-relaxed">
                  {format(new Date(previewDate + "T12:00:00"), "EEEE", {
                    locale: ptBR,
                  })}
                  :{" "}
                  {preview.windows.map((w, i) => (
                    <span key={i}>
                      {i > 0 && " + "}
                      <strong>{w.count}</strong> ({w.start}–{w.end})
                    </span>
                  ))}{" "}
                  = <strong>{preview.total}</strong> slots de{" "}
                  {service.durationMinutes} min
                </p>
                <p className="text-xs text-muted">
                  {rulesSaved && availableCount != null
                    ? `${availableCount} disponíveis após conflitos (Google + reservas)`
                    : "Salve a disponibilidade para calcular conflitos com Google e reservas."}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {preview.windows.flatMap((w) =>
                    w.slots.map((t) => (
                      <span key={t} className="tag tag-time">
                        {t}
                      </span>
                    )),
                  )}
                </div>
              </>
            )}
          </div>

          <div className="surface space-y-3 p-5">
            <h2 className="font-semibold tracking-tight">Exceções</h2>
            <p className="text-xs text-muted">Bloqueie feriados ou dias específicos.</p>
            <input
              type="date"
              className="input-field"
              value={exceptionDate}
              onChange={(e) => setExceptionDate(e.target.value)}
            />
            <button
              type="button"
              onClick={() => addException(true)}
              className="btn-secondary w-full !text-sm"
            >
              Bloquear dia
            </button>
            {exceptions.length > 0 && (
              <ul className="space-y-1 text-xs text-muted">
                {exceptions.slice(0, 8).map((e) => (
                  <li key={e.date}>
                    {e.date} — {e.isBlocked ? "bloqueado" : "aberto"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
