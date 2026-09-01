import {
  companyOpeningBrTemplate,
  COMPANY_OPENING_BR_KEY,
} from "@/lib/intake/templates/company-opening-br";
import type { IntakeTemplateDef } from "@/lib/intake/types";

const TEMPLATES: Record<string, IntakeTemplateDef> = {
  [COMPANY_OPENING_BR_KEY]: companyOpeningBrTemplate,
};

export function getIntakeTemplate(key: string | null | undefined): IntakeTemplateDef | null {
  if (!key) return null;
  return TEMPLATES[key] ?? null;
}

export function listIntakeTemplateKeys() {
  return Object.keys(TEMPLATES);
}

export { COMPANY_OPENING_BR_KEY, companyOpeningBrTemplate };
