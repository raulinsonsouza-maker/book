export const DEFAULT_ACCENT = "#0a0a0a";
export const DESCRIPTION_MAX = 300;

export type OrgBrand = {
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  accentColor?: string | null;
};

export function normalizeAccent(color?: string | null) {
  const c = (color || "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(c)) return c;
  if (/^#[0-9A-Fa-f]{3}$/.test(c)) {
    return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`;
  }
  return DEFAULT_ACCENT;
}

/** Resolve branding: override (página/link) → org → default. */
export function resolveBrand(params: {
  org: OrgBrand;
  logoUrl?: string | null;
  accentColor?: string | null;
  title?: string | null;
  description?: string | null;
}) {
  const accent =
    params.accentColor &&
    params.accentColor !== "#E87722" &&
    params.accentColor.trim()
      ? normalizeAccent(params.accentColor)
      : normalizeAccent(params.org.accentColor);

  return {
    businessName: params.org.name,
    title: (params.title || "").trim() || params.org.name,
    description:
      (params.description || "").trim() ||
      (params.org.description || "").trim() ||
      null,
    logoUrl: (params.logoUrl || "").trim() || (params.org.logoUrl || "").trim() || null,
    accentColor: accent,
  };
}
