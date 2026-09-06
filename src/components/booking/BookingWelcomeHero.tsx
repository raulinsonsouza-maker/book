"use client";

type Props = {
  coverUrl: string | null;
  /** Mantido por compatibilidade — não exibido na welcome */
  logoUrl?: string | null;
  accent: string;
  title: string;
  subtitle: string;
  ctaLabel?: string;
  onCta: () => void;
  secondaryCtaLabel?: string;
  onSecondaryCta?: () => void;
  preview?: boolean;
  editable?: boolean;
  onTitleChange?: (value: string) => void;
  onSubtitleChange?: (value: string) => void;
  onCoverFile?: (file: File | null) => void;
};

export function BookingWelcomeHero({
  coverUrl,
  accent,
  title,
  subtitle,
  ctaLabel = "Agendar",
  onCta,
  secondaryCtaLabel,
  onSecondaryCta,
  preview = false,
  editable = false,
  onTitleChange,
  onSubtitleChange,
  onCoverFile,
}: Props) {
  const hasCover = Boolean(coverUrl);

  const fileInput = editable && onCoverFile ? (
    <input
      type="file"
      accept="image/png,image/jpeg,image/webp,image/*"
      className="sr-only"
      onChange={(e) => {
        onCoverFile(e.target.files?.[0] ?? null);
        e.target.value = "";
      }}
    />
  ) : null;

  return (
    <div
      className={[
        "booking-welcome-hero",
        hasCover ? "booking-welcome-hero--cover" : "booking-welcome-hero--empty",
        preview ? "booking-welcome-hero--preview" : "",
        editable ? "booking-welcome-hero--editable" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          "--accent": accent,
          ...(hasCover
            ? {
                backgroundImage: `url("${String(coverUrl).replace(/\\/g, "/").replace(/"/g, "%22")}")`,
              }
            : null),
        } as React.CSSProperties
      }
    >
      {/* Sem capa: área de upload full-bleed */}
      {editable && onCoverFile && !hasCover ? (
        <label className="booking-welcome-media booking-welcome-media--upload">
          {fileInput}
          <div className="booking-welcome-cover-slot">
            <span className="booking-welcome-cover-icon" aria-hidden>
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="8.5" cy="10.5" r="1.5" />
                <path d="m21 15-4.5-4.5L9 18" />
              </svg>
            </span>
            <span className="booking-welcome-cover-title">Foto de destaque</span>
            <span className="booking-welcome-cover-hint">
              Toque para enviar a capa
            </span>
          </div>
        </label>
      ) : null}

      {!editable && !hasCover ? (
        <div
          className="booking-welcome-media"
          aria-hidden
          style={{
            background: `linear-gradient(165deg, color-mix(in srgb, ${accent} 35%, #1a1714) 0%, #12100e 55%, #0a0908 100%)`,
          }}
        />
      ) : null}

      <div className="booking-welcome-scrim" aria-hidden />

      {/* Com capa: trocar foto sem bloquear o CTA */}
      {editable && onCoverFile && hasCover ? (
        <label className="booking-welcome-cover-chip">
          {fileInput}
          Trocar foto
        </label>
      ) : null}

      <div className="booking-welcome-dock">
        <div className="booking-welcome-copy">
          {editable && onTitleChange ? (
            <input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Nome do local"
              aria-label="Nome do local"
              className="booking-welcome-title booking-welcome-title-input"
            />
          ) : (
            <h1 className="booking-welcome-title">{title}</h1>
          )}

          {editable && onSubtitleChange ? (
            <textarea
              value={subtitle}
              onChange={(e) => onSubtitleChange(e.target.value)}
              placeholder="Breve descrição do atendimento"
              aria-label="Descrição"
              rows={2}
              className="booking-welcome-sub booking-welcome-sub-input"
            />
          ) : subtitle ? (
            <p className="booking-welcome-sub">{subtitle}</p>
          ) : null}
        </div>

        <div className="booking-welcome-cta-stack">
          <button
            type="button"
            onClick={onCta}
            className="booking-welcome-cta"
            style={{ background: accent }}
          >
            {ctaLabel}
          </button>
          {secondaryCtaLabel && onSecondaryCta ? (
            <button
              type="button"
              onClick={onSecondaryCta}
              className="booking-welcome-cta booking-welcome-cta--secondary"
            >
              {secondaryCtaLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
