"use client";

import {
  VERTICAL_LIST,
  type VerticalSlug,
} from "@/lib/onboarding/verticals";

type Props = {
  vertical: VerticalSlug | null;
  onSelect: (slug: VerticalSlug) => void;
};

export function SegmentoStep({ vertical, onSelect }: Props) {
  return (
    <div className="space-y-7">
      <div>
        <h1 className="onboard-title text-[1.75rem] sm:text-[2rem]">
          Qual o seu segmento?
        </h1>
        <p className="onboard-lead mt-2.5 max-w-md">
          Escolha um para começarmos com serviços sugeridos.
        </p>
      </div>

      <div className="onboard-segment-grid" role="listbox" aria-label="Segmentos">
        {VERTICAL_LIST.map((v) => {
          const active = vertical === v.slug;
          return (
            <button
              key={v.slug}
              type="button"
              role="option"
              aria-selected={active}
              className={`onboard-segment-card ${active ? "is-active" : ""}`}
              onClick={() => onSelect(v.slug)}
            >
              <span className="onboard-segment-label">{v.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
