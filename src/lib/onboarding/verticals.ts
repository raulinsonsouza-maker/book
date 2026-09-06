export const VERTICAL_COOKIE = "onboarding_vertical";
export const VERTICAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type VerticalSlug =
  | "barbearias"
  | "salao-de-beleza"
  | "clinica-e-estetica"
  | "consultorio"
  | "esmalteria"
  | "estudio-e-bem-estar";

export type SuggestedService = {
  title: string;
  durationMinutes: number;
  priceCents: number;
};

export type VerticalConfig = {
  slug: VerticalSlug;
  label: string;
  businessNoun: string;
  /** One-line pitch for the segment picker */
  blurb: string;
  nameQuestion: string;
  namePlaceholder: string;
  descriptionPlaceholder: string;
  servicesLead: string;
  suggestedServices: SuggestedService[];
};

export const VERTICALS: Record<VerticalSlug, VerticalConfig> = {
  barbearias: {
    slug: "barbearias",
    label: "Barbearia",
    businessNoun: "barbearia",
    blurb: "Corte, barba e combo — cadeira cheia sem encaixe no Zap.",
    nameQuestion: "Como se chama sua barbearia?",
    namePlaceholder: "Ex.: Barbearia do João",
    descriptionPlaceholder: "Ex.: Corte, barba e combos",
    servicesLead:
      "De acordo com o seu tipo de negócio, sugerimos alguns serviços. Ajuste preços e duração como quiser.",
    suggestedServices: [
      { title: "Corte de Cabelo", durationMinutes: 30, priceCents: 5000 },
      { title: "Corte de Barba", durationMinutes: 30, priceCents: 3000 },
      { title: "Combo Cabelo e Barba", durationMinutes: 60, priceCents: 7000 },
      { title: "Pigmentação", durationMinutes: 45, priceCents: 8000 },
    ],
  },
  "salao-de-beleza": {
    slug: "salao-de-beleza",
    label: "Salão de beleza",
    businessNoun: "salão",
    blurb: "Escova, coloração e equipe no mesmo link.",
    nameQuestion: "Como se chama seu salão?",
    namePlaceholder: "Ex.: Studio Ana",
    descriptionPlaceholder: "Ex.: Escova, coloração e hidratação",
    servicesLead:
      "De acordo com o seu tipo de negócio, sugerimos alguns serviços. Ajuste preços e duração como quiser.",
    suggestedServices: [
      { title: "Escova", durationMinutes: 45, priceCents: 6000 },
      { title: "Coloração", durationMinutes: 120, priceCents: 18000 },
      { title: "Hidratação", durationMinutes: 60, priceCents: 9000 },
      { title: "Mechas", durationMinutes: 150, priceCents: 25000 },
    ],
  },
  "clinica-e-estetica": {
    slug: "clinica-e-estetica",
    label: "Clínica e estética",
    businessNoun: "clínica",
    blurb: "Procedimentos com duração e preço claros.",
    nameQuestion: "Como se chama sua clínica?",
    namePlaceholder: "Ex.: Clínica Bella",
    descriptionPlaceholder: "Ex.: Limpeza de pele, laser e peeling",
    servicesLead:
      "De acordo com o seu tipo de negócio, sugerimos alguns serviços. Ajuste preços e duração como quiser.",
    suggestedServices: [
      { title: "Limpeza de Pele", durationMinutes: 60, priceCents: 15000 },
      { title: "Laser", durationMinutes: 45, priceCents: 20000 },
      { title: "Peeling", durationMinutes: 40, priceCents: 18000 },
      { title: "Intradermoterapia", durationMinutes: 30, priceCents: 22000 },
    ],
  },
  consultorio: {
    slug: "consultorio",
    label: "Consultório",
    businessNoun: "consultório",
    blurb: "Consultas e retornos sem ida e volta no WhatsApp.",
    nameQuestion: "Como se chama seu consultório?",
    namePlaceholder: "Ex.: Consultório Dra. Maria",
    descriptionPlaceholder: "Ex.: Avaliação, retorno e procedimentos",
    servicesLead:
      "De acordo com o seu tipo de negócio, sugerimos alguns serviços. Ajuste preços e duração como quiser.",
    suggestedServices: [
      { title: "Avaliação", durationMinutes: 50, priceCents: 25000 },
      { title: "Retorno", durationMinutes: 30, priceCents: 15000 },
      { title: "Procedimento", durationMinutes: 60, priceCents: 35000 },
      { title: "Consulta", durationMinutes: 40, priceCents: 20000 },
    ],
  },
  esmalteria: {
    slug: "esmalteria",
    label: "Esmalteria",
    businessNoun: "esmalteria",
    blurb: "Alta rotatividade: o link preenche a semana.",
    nameQuestion: "Como se chama sua esmalteria?",
    namePlaceholder: "Ex.: Nail Studio",
    descriptionPlaceholder: "Ex.: Manicure, pedicure e spa dos pés",
    servicesLead:
      "De acordo com o seu tipo de negócio, sugerimos alguns serviços. Ajuste preços e duração como quiser.",
    suggestedServices: [
      { title: "Manicure", durationMinutes: 45, priceCents: 4500 },
      { title: "Pedicure", durationMinutes: 50, priceCents: 5500 },
      { title: "Spa dos pés", durationMinutes: 60, priceCents: 8000 },
      { title: "Blindagem", durationMinutes: 60, priceCents: 7000 },
    ],
  },
  "estudio-e-bem-estar": {
    slug: "estudio-e-bem-estar",
    label: "Estúdio e bem-estar",
    businessNoun: "estúdio",
    blurb: "Sessões, retornos e pagamento no mesmo fluxo.",
    nameQuestion: "Como se chama seu estúdio?",
    namePlaceholder: "Ex.: Espaço Zen",
    descriptionPlaceholder: "Ex.: Massagem, drenagem e terapias",
    servicesLead:
      "De acordo com o seu tipo de negócio, sugerimos alguns serviços. Ajuste preços e duração como quiser.",
    suggestedServices: [
      { title: "Massagem", durationMinutes: 60, priceCents: 12000 },
      { title: "Drenagem", durationMinutes: 50, priceCents: 11000 },
      { title: "Terapia", durationMinutes: 60, priceCents: 15000 },
      { title: "Ritual", durationMinutes: 90, priceCents: 20000 },
    ],
  },
};

export const VERTICAL_LIST = Object.values(VERTICALS);

export function isVerticalSlug(value: string | null | undefined): value is VerticalSlug {
  return Boolean(value && value in VERTICALS);
}

export function parseVerticalSlug(
  value: string | null | undefined,
): VerticalSlug | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return isVerticalSlug(trimmed) ? trimmed : null;
}

export function getVertical(slug: VerticalSlug | null | undefined): VerticalConfig | null {
  if (!slug) return null;
  return VERTICALS[slug] ?? null;
}

export function defaultCopy() {
  return {
    nameQuestion: "Como se chama seu negócio?",
    namePlaceholder: "Ex.: Studio Ana",
    descriptionPlaceholder: "Ex.: Corte, coloração e escova",
    servicesLead:
      "Cadastre os serviços principais. Você pode editar preços e duração a qualquer momento.",
  };
}

/** Client-only cookie helpers */
export function setVerticalCookie(slug: VerticalSlug) {
  if (typeof document === "undefined") return;
  document.cookie = `${VERTICAL_COOKIE}=${encodeURIComponent(slug)}; path=/; max-age=${VERTICAL_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function getVerticalCookie(): VerticalSlug | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${VERTICAL_COOKIE}=`));
  if (!match) return null;
  const raw = decodeURIComponent(match.split("=").slice(1).join("="));
  return parseVerticalSlug(raw);
}

export function clearVerticalCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${VERTICAL_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
