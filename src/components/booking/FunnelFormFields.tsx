"use client";

import { formatCpf, formatPhone } from "@/lib/utils";
import type { FormFieldConfig } from "@/types/funnel-config";

type Props = {
  fields: FormFieldConfig[];
  values: Record<string, string>;
  onChange: (id: string, value: string) => void;
  details: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerCpf: string;
  };
  onDetailsChange: (patch: Partial<Props["details"]>) => void;
};

function detailKey(field: FormFieldConfig): keyof Props["details"] | null {
  if (field.preset === "customerName") return "customerName";
  if (field.preset === "customerEmail") return "customerEmail";
  if (field.preset === "customerPhone") return "customerPhone";
  if (field.preset === "customerCpf") return "customerCpf";
  return null;
}

export function FunnelFormFields({
  fields,
  values,
  onChange,
  details,
  onDetailsChange,
}: Props) {
  return (
    <>
      {fields.map((field) => {
        const dk = detailKey(field);
        const label = (
          <span className="mb-1.5 block font-medium">
            {field.label}
            {!field.required ? " (opcional)" : ""}
          </span>
        );

        if (dk) {
          const val = details[dk];
          const set = (v: string) => onDetailsChange({ [dk]: v });
          if (field.type === "phone") {
            return (
              <label key={field.id} className="block text-sm">
                {label}
                <input
                  required={field.required}
                  inputMode="tel"
                  className="input-field"
                  value={val}
                  onChange={(e) => set(formatPhone(e.target.value))}
                />
              </label>
            );
          }
          if (field.type === "cpf") {
            return (
              <label key={field.id} className="block text-sm sm:col-span-2">
                {label}
                <input
                  required={field.required}
                  inputMode="numeric"
                  className="input-field"
                  value={val}
                  onChange={(e) => set(formatCpf(e.target.value))}
                />
              </label>
            );
          }
          if (field.type === "email") {
            return (
              <label key={field.id} className="block text-sm">
                {label}
                <input
                  required={field.required}
                  type="email"
                  className="input-field"
                  value={val}
                  onChange={(e) => set(e.target.value)}
                />
              </label>
            );
          }
          return (
            <label key={field.id} className="block text-sm sm:col-span-2">
              {label}
              <input
                required={field.required}
                className="input-field"
                value={val}
                onChange={(e) => set(e.target.value)}
              />
            </label>
          );
        }

        if (field.type === "textarea") {
          return (
            <label key={field.id} className="block text-sm sm:col-span-2">
              {label}
              <textarea
                required={field.required}
                rows={3}
                className="input-field"
                value={values[field.id] || ""}
                onChange={(e) => onChange(field.id, e.target.value)}
              />
            </label>
          );
        }

        if (field.type === "select") {
          return (
            <label key={field.id} className="block text-sm sm:col-span-2">
              {label}
              <select
                required={field.required}
                className="input-field"
                value={values[field.id] || ""}
                onChange={(e) => onChange(field.id, e.target.value)}
              >
                <option value="">Selecione</option>
                {(field.options || []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          );
        }

        return (
          <label key={field.id} className="block text-sm sm:col-span-2">
            {label}
            <input
              required={field.required}
              className="input-field"
              value={values[field.id] || ""}
              onChange={(e) => onChange(field.id, e.target.value)}
            />
          </label>
        );
      })}
    </>
  );
}
