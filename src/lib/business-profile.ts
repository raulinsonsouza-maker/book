import type { VerticalSlug } from "@/lib/onboarding/verticals";

export type BusinessProfileId = "SALON" | "CLINIC" | "BARBER" | "STUDIO";

export type BusinessFeatureFlags = {
  clientsCrm: boolean;
  visitNotes: boolean;
  prescriptions: boolean;
  attendanceCertificates: boolean;
  floorBoard: boolean;
};

export type BusinessProfileLabels = {
  id: BusinessProfileId;
  label: string;
  clientNoun: string;
  clientNounPlural: string;
  visitNoun: string;
  visitNounPlural: string;
  chartNoun: string;
};

export type ResolvedBusinessProfile = BusinessProfileLabels & {
  features: BusinessFeatureFlags;
};

const PROFILE_BASE: Record<
  BusinessProfileId,
  Omit<BusinessProfileLabels, "id"> & { features: BusinessFeatureFlags }
> = {
  SALON: {
    label: "Salão de beleza",
    clientNoun: "Cliente",
    clientNounPlural: "Clientes",
    visitNoun: "Atendimento",
    visitNounPlural: "Atendimentos",
    chartNoun: "Prontuário",
    features: {
      clientsCrm: true,
      visitNotes: true,
      prescriptions: false,
      attendanceCertificates: false,
      floorBoard: true,
    },
  },
  BARBER: {
    label: "Barbearia",
    clientNoun: "Cliente",
    clientNounPlural: "Clientes",
    visitNoun: "Atendimento",
    visitNounPlural: "Atendimentos",
    chartNoun: "Prontuário",
    features: {
      clientsCrm: true,
      visitNotes: true,
      prescriptions: false,
      attendanceCertificates: false,
      floorBoard: true,
    },
  },
  STUDIO: {
    label: "Estúdio e bem-estar",
    clientNoun: "Cliente",
    clientNounPlural: "Clientes",
    visitNoun: "Sessão",
    visitNounPlural: "Sessões",
    chartNoun: "Prontuário",
    features: {
      clientsCrm: true,
      visitNotes: true,
      prescriptions: false,
      attendanceCertificates: false,
      floorBoard: false,
    },
  },
  CLINIC: {
    label: "Clínica / consultório",
    clientNoun: "Paciente",
    clientNounPlural: "Pacientes",
    visitNoun: "Consulta",
    visitNounPlural: "Consultas",
    chartNoun: "Prontuário",
    features: {
      clientsCrm: true,
      visitNotes: true,
      prescriptions: true,
      attendanceCertificates: true,
      floorBoard: true,
    },
  },
};

export const BUSINESS_PROFILES: BusinessProfileId[] = [
  "SALON",
  "BARBER",
  "CLINIC",
  "STUDIO",
];

export function parseBusinessProfile(
  raw: string | null | undefined,
): BusinessProfileId | null {
  if (!raw) return null;
  const v = raw.trim().toUpperCase();
  if (v === "SALON" || v === "CLINIC" || v === "BARBER" || v === "STUDIO") {
    return v;
  }
  return null;
}

export function profileFromVertical(
  slug: VerticalSlug | null | undefined,
): BusinessProfileId {
  switch (slug) {
    case "barbearias":
      return "BARBER";
    case "clinica-e-estetica":
    case "consultorio":
      return "CLINIC";
    case "estudio-e-bem-estar":
      return "STUDIO";
    case "salao-de-beleza":
    case "esmalteria":
    default:
      return "SALON";
  }
}

export function defaultFeatureFlags(
  profile: BusinessProfileId,
): BusinessFeatureFlags {
  return { ...PROFILE_BASE[profile].features };
}

export function parseFeatureFlagsJson(
  raw: string | null | undefined,
): Partial<BusinessFeatureFlags> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Partial<BusinessFeatureFlags>;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

export function resolveBusinessProfile(
  profileRaw: string | null | undefined,
  featureFlagsRaw?: string | null,
  attendanceEnabled?: boolean,
): ResolvedBusinessProfile {
  const id = parseBusinessProfile(profileRaw) || "SALON";
  const base = PROFILE_BASE[id];
  const overrides = parseFeatureFlagsJson(featureFlagsRaw);
  const features: BusinessFeatureFlags = {
    ...base.features,
    ...overrides,
  };
  if (attendanceEnabled) {
    features.attendanceCertificates = true;
  }
  return {
    id,
    label: base.label,
    clientNoun: base.clientNoun,
    clientNounPlural: base.clientNounPlural,
    visitNoun: base.visitNoun,
    visitNounPlural: base.visitNounPlural,
    chartNoun: base.chartNoun,
    features,
  };
}

export function profileOptions(): {
  id: BusinessProfileId;
  label: string;
  clientNounPlural: string;
}[] {
  return BUSINESS_PROFILES.map((id) => ({
    id,
    label: PROFILE_BASE[id].label,
    clientNounPlural: PROFILE_BASE[id].clientNounPlural,
  }));
}
