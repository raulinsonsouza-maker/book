export const PLATFORM_PLAN_SLUGS = {
  monthly: "essencial-mensal",
  semester: "essencial-semestral",
} as const;

export type PlatformPlanSlug =
  (typeof PLATFORM_PLAN_SLUGS)[keyof typeof PLATFORM_PLAN_SLUGS];

/** Fallback display when API is unavailable */
export const PLATFORM_PLAN_FALLBACKS = [
  {
    slug: PLATFORM_PLAN_SLUGS.monthly,
    name: "Essencial Mensal",
    priceCents: 9700,
    interval: "MONTH" as const,
    whatsappQuotaMonthly: 600,
    highlight: false,
    badge: null as string | null,
    priceLabel: "R$ 97/mês",
    detail: "Cobrança mensal",
    compareAtCents: null as number | null,
    savingsCents: null as number | null,
    installmentHint: null as string | null,
    monthlyEquivalentCents: 9700,
  },
  {
    slug: PLATFORM_PLAN_SLUGS.semester,
    name: "Essencial Semestral",
    priceCents: 40200,
    interval: "SEMESTER" as const,
    whatsappQuotaMonthly: 600,
    highlight: true,
    badge: "Economize 31%",
    priceLabel: "R$ 67/mês",
    detail: "R$ 402 no semestre · até 6x no cartão",
    compareAtCents: 58200,
    savingsCents: 18000,
    installmentHint: "Em até 6x no cartão",
    monthlyEquivalentCents: 6700,
  },
];

export function isPlatformPlanSlug(v: string): v is PlatformPlanSlug {
  return (
    v === PLATFORM_PLAN_SLUGS.monthly || v === PLATFORM_PLAN_SLUGS.semester
  );
}
