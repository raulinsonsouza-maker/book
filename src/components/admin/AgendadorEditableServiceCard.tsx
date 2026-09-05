"use client";

import {
  centsToBRLMask,
  maskBRLFromDigits,
  maskMinutes,
  parseBRLMaskToCents,
} from "@/lib/utils";
import type { PreviewService } from "@/components/admin/AgendadorFunnelStepPreview";

type Props = {
  service: PreviewService;
  accent: string;
  onChange: (patch: Partial<PreviewService>) => void;
  onImageFile: (file: File | null) => void;
  onPick: () => void;
};

export function AgendadorEditableServiceCard({
  service,
  accent,
  onChange,
  onImageFile,
  onPick,
}: Props) {
  const priceMasked = centsToBRLMask(service.priceCents || 0);
  const duration = service.durationMinutes || 30;

  return (
    <div className="booking-service agendador-service-card-edit w-full !cursor-default">
      <div className="flex items-start gap-3">
        <label className="booking-service-thumb agendador-service-thumb-editable shrink-0">
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              onImageFile(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
          {service.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={service.imageUrl} alt="" />
          ) : (
            <span aria-hidden>
              {service.title.slice(0, 1).toUpperCase() || "?"}
            </span>
          )}
          <span className="agendador-service-thumb-hint">
            {service.imageUrl ? "Trocar" : "Foto"}
          </span>
        </label>

        <div className="min-w-0 flex-1 space-y-1">
          <input
            value={service.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Nome do serviço"
            className="agendador-service-field agendador-service-field-title w-full"
          />
          <textarea
            value={service.description || ""}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Descrição (opcional)"
            rows={2}
            className="agendador-service-field agendador-service-field-desc w-full"
          />
        </div>
      </div>

      <div className="agendador-service-meta">
        <label className="agendador-service-duration-wrap">
          <input
            inputMode="numeric"
            value={String(duration)}
            onChange={(e) =>
              onChange({
                durationMinutes: Math.max(
                  5,
                  parseInt(maskMinutes(e.target.value), 10) || 5,
                ),
              })
            }
            className="agendador-service-field agendador-service-field-duration"
            aria-label="Duração em minutos"
          />
          <span>min</span>
        </label>

        <input
          value={priceMasked}
          onChange={(e) =>
            onChange({
              priceCents: parseBRLMaskToCents(
                maskBRLFromDigits(e.target.value),
              ),
            })
          }
          className="agendador-service-field-price"
          style={{ background: accent }}
          aria-label="Preço"
        />

        <button
          type="button"
          onClick={onPick}
          className="agendador-service-next"
          style={{ background: accent }}
          aria-label="Próximo passo na prévia"
        >
          →
        </button>
      </div>
    </div>
  );
}
