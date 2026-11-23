import {
  defaultFormFields,
  enabledFormFields,
  parseFunnelConfig,
} from "@/lib/funnel-config";
import type { FormFieldConfig, FunnelConfig } from "@/types/funnel-config";

export type PayMethod = "pix" | "card";

export type ProductFormConfig = {
  formFields: FormFieldConfig[];
  /** Formas aceitas no link. Vazio/omitido = Pix e cartão. */
  payMethods?: PayMethod[];
};

/** Campos exigidos pelos gateways para gerar Pix/cartão sem erro. */
export const CHECKOUT_LOCKED_PRESETS = [
  "customerName",
  "customerEmail",
  "customerPhone",
  "customerCpf",
] as const;

export type CheckoutLockedPreset = (typeof CHECKOUT_LOCKED_PRESETS)[number];

export function isCheckoutLockedPreset(
  preset: string | undefined,
): preset is CheckoutLockedPreset {
  return (
    !!preset &&
    (CHECKOUT_LOCKED_PRESETS as readonly string[]).includes(preset)
  );
}

export function defaultPayMethods(): PayMethod[] {
  return ["pix", "card"];
}

export function normalizePayMethods(
  methods?: PayMethod[] | null,
): PayMethod[] {
  const allowed = new Set(
    (methods || []).filter((m): m is PayMethod => m === "pix" || m === "card"),
  );
  if (allowed.size === 0) return defaultPayMethods();
  return (["pix", "card"] as const).filter((m) => allowed.has(m));
}

/** Garante nome, e-mail, celular e CPF ativos e obrigatórios. */
export function ensurePaymentRequiredFields(
  fields: FormFieldConfig[],
): FormFieldConfig[] {
  const byPreset = new Map(
    fields.filter((f) => f.preset).map((f) => [f.preset!, f]),
  );
  const defaults = defaultFormFields();

  for (const preset of CHECKOUT_LOCKED_PRESETS) {
    const existing = byPreset.get(preset);
    if (existing) {
      existing.enabled = true;
      existing.required = true;
    } else {
      const fallback = defaults.find((f) => f.preset === preset);
      if (fallback) {
        fields = [
          ...fields,
          { ...fallback, enabled: true, required: true },
        ];
      }
    }
  }

  return fields.map((f) =>
    isCheckoutLockedPreset(f.preset)
      ? { ...f, enabled: true, required: true }
      : f,
  );
}

export function defaultProductFormConfig(): ProductFormConfig {
  return {
    formFields: ensurePaymentRequiredFields(defaultFormFields()),
    payMethods: defaultPayMethods(),
  };
}

export function parseProductFormConfig(raw: string | null | undefined): ProductFormConfig {
  if (!raw) return defaultProductFormConfig();
  try {
    const parsed = JSON.parse(raw) as ProductFormConfig;
    if (parsed?.formFields?.length) {
      return {
        formFields: ensurePaymentRequiredFields(parsed.formFields),
        payMethods: normalizePayMethods(parsed.payMethods),
      };
    }
  } catch {
    /* fallback */
  }
  const funnel = parseFunnelConfig(raw);
  if (funnel?.formFields?.length) {
    return {
      formFields: ensurePaymentRequiredFields(funnel.formFields),
      payMethods: defaultPayMethods(),
    };
  }
  return defaultProductFormConfig();
}

export function enabledProductFormFields(config: ProductFormConfig | null) {
  return enabledFormFields(
    config ? ({ formFields: config.formFields } as FunnelConfig) : null,
  );
}

export function serializeProductFormConfig(config: ProductFormConfig) {
  return JSON.stringify({
    ...config,
    formFields: ensurePaymentRequiredFields(config.formFields),
    payMethods: normalizePayMethods(config.payMethods),
  });
}
