export type OnboardingStepId =
  | "segmento"
  | "empresa"
  | "modo"
  | "servicos"
  | "expediente"
  | "conta"
  | "pronto";

export type OnboardingStepMeta = {
  id: OnboardingStepId;
  label: string;
  description: string;
};

export const ONBOARDING_STEPS: OnboardingStepMeta[] = [
  {
    id: "segmento",
    label: "Segmento",
    description: "Qual o tipo do seu negócio",
  },
  {
    id: "empresa",
    label: "Sobre o seu negócio",
    description: "Começando a conhecer melhor o seu negócio",
  },
  {
    id: "modo",
    label: "Equipe",
    description: "Quem atende na sua agenda",
  },
  {
    id: "servicos",
    label: "Serviços sugeridos",
    description: "Defina preços e tempo dos seus serviços",
  },
  {
    id: "expediente",
    label: "Expediente",
    description: "Configure os horários de atendimento",
  },
  {
    id: "conta",
    label: "Conta e plano",
    description: "Assine e libere sua agenda",
  },
  {
    id: "pronto",
    label: "Pronto",
    description: "Tudo configurado para começar",
  },
];

/** Steps shown in sidebar (segmento may be skipped when tipo is known). */
export function visibleOnboardingSteps(includeSegmento: boolean) {
  return includeSegmento
    ? ONBOARDING_STEPS
    : ONBOARDING_STEPS.filter((s) => s.id !== "segmento");
}

export type ServiceDraft = {
  title: string;
  durationMinutes: number;
  priceMask: string;
};

export type AvailabilityRuleDraft = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export const DEFAULT_COMMERCIAL_HOURS: AvailabilityRuleDraft[] = [1, 2, 3, 4, 5].flatMap(
  (dayOfWeek) => [
    { dayOfWeek, startTime: "09:00", endTime: "12:00" },
    { dayOfWeek, startTime: "13:00", endTime: "18:00" },
  ],
);

export const ONBOARDING_DRAFT_KEY = "onboarding_draft_v1";

export type ProDraft = {
  displayName: string;
  email: string;
  phone: string;
};

export type OnboardingDraft = {
  vertical: string | null;
  name: string;
  description: string;
  logoUrl: string;
  accentColor: string;
  businessMode: "SOLO" | "SALON";
  /** @deprecated prefer professionals */
  proNames?: string[];
  professionals?: ProDraft[];
  services: ServiceDraft[];
  hours: AvailabilityRuleDraft[];
  planSlug: string;
  step?: OnboardingStepId;
};
