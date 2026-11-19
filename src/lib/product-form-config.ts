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

export function defaultProductFormConfig(): ProductFormConfig {
  return {
    formFields: defaultFormFields().map((f) =>
      f.preset === "customerCpf"
        ? { ...f, enabled: true, required: true }
        : f,
    ),
    payMethods: defaultPayMethods(),
  };
}

export function parseProductFormConfig(raw: string | null | undefined): ProductFormConfig {
  if (!raw) return defaultProductFormConfig();
  try {
    const parsed = JSON.parse(raw) as ProductFormConfig;
    if (parsed?.formFields?.length) {
      return {
        formFields: parsed.formFields,
        payMethods: normalizePayMethods(parsed.payMethods),
      };
    }
  } catch {
    /* fallback */
  }
  const funnel = parseFunnelConfig(raw);
  if (funnel?.formFields?.length) {
    return {
      formFields: funnel.formFields,
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
  return JSON.stringify(config);
}
