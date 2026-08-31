"use client";

import { centsToBRLMask, maskBRLFromDigits, maskMinutes, parseBRLMaskToCents } from "@/lib/utils";
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
  const priceMasked = centsToBRLMask(service.priceCents);

  return (
    <div className="booking-service w-full !cursor-default">
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
            <span aria-hidden>{service.title.slice(0, 1).toUpperCase() || "?"}</span>
          )}
          <span className="agendador-service-thumb-hint">
            {service.imageUrl ? "Trocar" : "Foto"}
          </span>
        </label>

        <div className="min-w-0 flex-1 space-y-2">
          <input
            value={service.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Nome do serviço"
            className="agendador-service-field agendador-service-field-title"
          />
          <textarea
            value={service.description || ""}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Descrição (opcional)"
            rows={2}
            className="agendador-service-field agendador-service-field-desc"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-muted">
              <span>Duração</span>
              <input
                inputMode="numeric"
                value={String(service.durationMinutes)}
                onChange={(e) =>
                  onChange({
                    durationMinutes: Math.max(
                      5,
                      parseInt(maskMinutes(e.target.value), 10) || 5,
                    ),
                  })
                }
                className="agendador-service-field agendador-service-field-duration w-14 text-center"
              />
              <span>min</span>
            </label>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2 self-center">
          <input
            value={priceMasked}
            onChange={(e) =>
              onChange({
                priceCents: parseBRLMaskToCents(maskBRLFromDigits(e.target.value)),
              })
            }
            className="agendador-service-field agendador-service-field-price text-right font-bold text-white"
            style={{ background: accent }}
            aria-label="Preço"
          />
          <button
            type="button"
            onClick={onPick}
            className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white transition hover:scale-105"
            style={{ background: accent }}
            aria-label="Próximo passo na prévia"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}

