"use client";

import { useState } from "react";
import {
  centsToBRLMask,
  maskBRLFromDigits,
  parseBRLMaskToCents,
} from "@/lib/utils";
import type { ServiceDraft } from "../types";

type Props = {
  services: ServiceDraft[];
  servicesLead: string;
  onChange: (services: ServiceDraft[]) => void;
  onClearError: () => void;
};

function formatDuration(mins: number) {
  if (mins < 60) return `${mins} minutos`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return h === 1 ? "1 hora" : `${h} horas`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

function emptyDraft(): ServiceDraft {
  return { title: "", durationMinutes: 30, priceMask: "" };
}

export function ServicosStep({
  services,
  servicesLead,
  onChange,
  onClearError,
}: Props) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<ServiceDraft>(emptyDraft());

  function openEdit(i: number) {
    setEditingIndex(i);
    setDraft({ ...services[i]! });
  }

  function openNew() {
    setEditingIndex(-1);
    setDraft(emptyDraft());
  }

  function closeEdit() {
    setEditingIndex(null);
  }

  function saveEdit() {
    const title = draft.title.trim();
    if (title.length < 2) return;
    const next = [...services];
    const item: ServiceDraft = {
      title,
      durationMinutes: Math.min(480, Math.max(5, Number(draft.durationMinutes) || 30)),
      priceMask: draft.priceMask || centsToBRLMask(0),
    };
    if (editingIndex === -1) {
      next.push(item);
    } else if (editingIndex != null) {
      next[editingIndex] = item;
    }
    onChange(next);
    onClearError();
    closeEdit();
  }

  const hoursOptions = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const minuteOptions = [0, 15, 30, 45];
  const hours = Math.floor((draft.durationMinutes || 0) / 60);
  const minutes = (draft.durationMinutes || 0) % 60;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="onboard-title text-2xl sm:text-[1.85rem]">
          Serviços sugeridos
        </h1>
        <p className="onboard-lead mt-2">{servicesLead}</p>
      </div>

      {editingIndex === null ? (
        <>
          <ul className="onboard-service-list">
            {services.map((s, i) => (
              <li key={`${s.title}-${i}`} className="onboard-service-row">
                <button
                  type="button"
                  className="onboard-service-remove"
                  aria-label={`Remover ${s.title || "serviço"}`}
                  onClick={() => {
                    onChange(services.filter((_, j) => j !== i));
                    onClearError();
                  }}
                >
                  ×
                </button>
                <span className="onboard-service-name">
                  {s.title || "Sem título"}
                </span>
                <span className="onboard-service-meta">
                  <span className="onboard-service-pill">
                    {s.priceMask || centsToBRLMask(0)}
                  </span>
                  <span className="onboard-service-pill">
                    {formatDuration(s.durationMinutes || 30)}
                  </span>
                </span>
                <button
                  type="button"
                  className="onboard-service-edit"
                  aria-label={`Editar ${s.title || "serviço"}`}
                  onClick={() => openEdit(i)}
                >
                  ✎
                </button>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between gap-3 text-sm">
            <button
              type="button"
              className="font-medium text-[var(--lp-steel)] hover:text-[var(--lp-ink)]"
              disabled={!services.length}
              onClick={() => {
                onChange([]);
                onClearError();
              }}
            >
              Remover todos
            </button>
            <button
              type="button"
              className="font-medium text-[var(--lp-accent)] hover:underline"
              onClick={openNew}
            >
              Adicionar mais
            </button>
          </div>
        </>
      ) : (
        <div className="onboard-service-editor space-y-4">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Nome do serviço</span>
            <input
              className="input-field"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="Ex.: Corte de Cabelo"
              autoFocus
            />
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Horas</span>
              <select
                className="input-field"
                value={hours}
                onChange={(e) => {
                  const h = Number(e.target.value);
                  setDraft((d) => ({
                    ...d,
                    durationMinutes: h * 60 + (d.durationMinutes % 60),
                  }));
                }}
              >
                {hoursOptions.map((h) => (
                  <option key={h} value={h}>
                    {h === 0 ? "0 hora" : h === 1 ? "1 hora" : `${h} horas`}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Minutos</span>
              <select
                className="input-field"
                value={minuteOptions.includes(minutes) ? minutes : 0}
                onChange={(e) => {
                  const m = Number(e.target.value);
                  setDraft((d) => ({
                    ...d,
                    durationMinutes: Math.floor(d.durationMinutes / 60) * 60 + m,
                  }));
                }}
              >
                {minuteOptions.map((m) => (
                  <option key={m} value={m}>
                    {m === 0 ? "0 min" : `${m} minutos`}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Preço</span>
              <input
                className="input-field"
                value={draft.priceMask}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    priceMask: maskBRLFromDigits(e.target.value),
                  }))
                }
                placeholder="R$ 0,00"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={closeEdit}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn-primary flex-1"
              onClick={saveEdit}
              disabled={draft.title.trim().length < 2}
            >
              Salvar alterações
            </button>
          </div>
          {editingIndex === -1 && (
            <p className="text-xs text-muted">
              Preço atual:{" "}
              {centsToBRLMask(parseBRLMaskToCents(draft.priceMask) || 0)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
