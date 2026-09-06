"use client";

import { DESCRIPTION_MAX } from "@/lib/branding";
import {
  VERTICAL_LIST,
  type VerticalSlug,
} from "@/lib/onboarding/verticals";

type Props = {
  name: string;
  description: string;
  logoUrl: string;
  accentColor: string;
  nameQuestion: string;
  namePlaceholder: string;
  descriptionPlaceholder: string;
  showVerticalPicker: boolean;
  vertical: VerticalSlug | null;
  onVerticalChange: (slug: VerticalSlug) => void;
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onAccentChange: (v: string) => void;
  onLogoFile: (file: File | null) => void;
  onClearLogo: () => void;
  onClearError: () => void;
};

export function EmpresaStep({
  name,
  description,
  logoUrl,
  accentColor,
  nameQuestion,
  namePlaceholder,
  descriptionPlaceholder,
  showVerticalPicker,
  vertical,
  onVerticalChange,
  onNameChange,
  onDescriptionChange,
  onAccentChange,
  onLogoFile,
  onClearLogo,
  onClearError,
}: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="onboard-title text-2xl sm:text-[1.85rem]">{nameQuestion}</h1>
        <p className="onboard-lead mt-2">
          Em poucos minutos sua agenda fica pronta para receber clientes.
        </p>
      </div>

      {showVerticalPicker && (
        <div>
          <p className="mb-2 text-sm font-medium">Qual o seu segmento?</p>
          <div className="onboard-vertical-grid">
            {VERTICAL_LIST.map((v) => (
              <button
                key={v.slug}
                type="button"
                className={`onboard-vertical-chip ${
                  vertical === v.slug ? "is-active" : ""
                }`}
                onClick={() => onVerticalChange(v.slug)}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Nome</span>
        <input
          className="input-field"
          value={name}
          onChange={(e) => {
            onNameChange(e.target.value);
            onClearError();
          }}
          placeholder={namePlaceholder}
          autoFocus
        />
      </label>

      <details className="onboard-details">
        <summary>Personalizar página (opcional)</summary>
        <div className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Descrição curta</span>
            <textarea
              maxLength={DESCRIPTION_MAX}
              className="input-field min-h-[72px]"
              value={description}
              onChange={(e) => {
                onDescriptionChange(e.target.value);
                onClearError();
              }}
              placeholder={descriptionPlaceholder}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Logotipo</span>
            <div className="onboard-logo-row">
              <div className="onboard-logo-preview">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="" />
                ) : (
                  <span>Logo</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="btn-secondary cursor-pointer !py-2 !text-xs">
                    Enviar imagem
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => onLogoFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  {logoUrl && (
                    <button
                      type="button"
                      className="text-xs font-medium text-[var(--lp-steel)] hover:text-danger"
                      onClick={onClearLogo}
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            </div>
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Cor de destaque</span>
            <div className="onboard-color-row">
              <span className="onboard-color-swatch">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => onAccentChange(e.target.value)}
                  aria-label="Escolher cor de destaque"
                />
              </span>
              <input
                className="input-field max-w-[7.5rem] font-mono text-sm uppercase"
                value={accentColor}
                onChange={(e) => onAccentChange(e.target.value)}
                pattern="^#[0-9A-Fa-f]{6}$"
              />
              <span
                className="onboard-color-preview"
                style={{ background: accentColor }}
              >
                Prévia
              </span>
            </div>
          </label>
        </div>
      </details>
    </div>
  );
}
