import { z } from "zod";
import { enabledProductFormFields, type ProductFormConfig } from "@/lib/product-form-config";
import { isValidCpf } from "@/lib/utils";

export type CheckoutOrderBody = {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerCpf?: string;
  customAnswers?: Record<string, string>;
};

export function buildCheckoutOrderSchema(formConfig: ProductFormConfig | null) {
  const fields = enabledProductFormFields(formConfig);
  const shape: Record<string, z.ZodTypeAny> = {
    customAnswers: z.record(z.string(), z.string()).optional(),
  };

  for (const field of fields) {
    const str = field.required ? z.string().min(1) : z.string().optional();
    if (field.preset === "customerName") shape.customerName = field.required ? z.string().min(2) : str;
    else if (field.preset === "customerEmail") shape.customerEmail = field.required ? z.string().email() : str;
    else if (field.preset === "customerPhone") shape.customerPhone = field.required ? z.string().min(8) : str;
    else if (field.preset === "customerCpf") shape.customerCpf = str;
  }

  if (!shape.customerName) shape.customerName = z.string().min(2);
  if (!shape.customerEmail) shape.customerEmail = z.string().email().optional();
  if (!shape.customerPhone) shape.customerPhone = z.string().optional();
  // Pagamentos Asaas/MP exigem CPF — sempre obrigatório no checkout de produto.
  shape.customerCpf = z.string().min(11);

  return z.object(shape).superRefine((data, ctx) => {
    const answers = data.customAnswers as Record<string, string> | undefined;
    if (!data.customerCpf || !isValidCpf(String(data.customerCpf))) {
      ctx.addIssue({ code: "custom", message: "CPF inválido", path: ["customerCpf"] });
    }
    for (const field of fields) {
      if (!field.preset && field.required) {
        const val = answers?.[field.id];
        if (!val?.trim()) {
          ctx.addIssue({
            code: "custom",
            message: `${field.label} é obrigatório`,
            path: ["customAnswers", field.id],
          });
        }
      }
    }
  });
}

export function parseCheckoutOrderBody(
  formConfig: ProductFormConfig | null,
  raw: unknown,
): CheckoutOrderBody {
  return buildCheckoutOrderSchema(formConfig).parse(raw) as CheckoutOrderBody;
}
