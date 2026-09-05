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

function placeholderFor(field: FormFieldConfig): string {
  if (field.preset === "customerName") return "Seu nome completo";
  if (field.preset === "customerEmail" || field.type === "email")
    return "voce@email.com";
  if (field.preset === "customerPhone" || field.type === "phone")
    return "(11) 99999-9999";
  if (field.preset === "customerCpf" || field.type === "cpf")
    return "000.000.000-00";
  if (field.preset === "message" || field.type === "textarea")
    return "Alguma observação?";
  if (field.preset === "company") return "Nome da empresa";
  if (field.type === "select") return "Selecione";
  return field.label;
}

export function FunnelFormFields({
  fields,
  values,
  onChange,
  details,
  onDetailsChange,
}: Props) {
  return (
    <div className="booking-form-fields">
      {fields.map((field) => {
        const dk = detailKey(field);
        const label = (
          <span className="booking-field-label">
            {field.label}
            {!field.required ? (
              <span className="booking-field-optional"> opcional</span>
            ) : null}
          </span>
        );

        if (dk) {
          const val = details[dk];
          const set = (v: string) => onDetailsChange({ [dk]: v });
          if (field.type === "phone") {
            return (
              <label key={field.id} className="booking-field">
                {label}
                <input
                  required={field.required}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder={placeholderFor(field)}
                  className="booking-field-input"
                  value={val}
                  onChange={(e) => set(formatPhone(e.target.value))}
                />
              </label>
            );
          }
          if (field.type === "cpf") {
            return (
              <label key={field.id} className="booking-field">
                {label}
                <input
                  required={field.required}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder={placeholderFor(field)}
                  className="booking-field-input"
                  value={val}
                  onChange={(e) => set(formatCpf(e.target.value))}
                />
              </label>
            );
          }
          if (field.type === "email") {
            return (
              <label key={field.id} className="booking-field">
                {label}
                <input
                  required={field.required}
                  type="email"
                  autoComplete="email"
                  placeholder={placeholderFor(field)}
                  className="booking-field-input"
                  value={val}
                  onChange={(e) => set(e.target.value)}
                />
              </label>
            );
          }
          return (
            <label key={field.id} className="booking-field">
              {label}
              <input
                required={field.required}
                autoComplete="name"
                placeholder={placeholderFor(field)}
                className="booking-field-input"
                value={val}
                onChange={(e) => set(e.target.value)}
              />
            </label>
          );
        }

        if (field.type === "textarea") {
          return (
            <label key={field.id} className="booking-field">
              {label}
              <textarea
                required={field.required}
                rows={3}
                placeholder={placeholderFor(field)}
                className="booking-field-input booking-field-textarea"
                value={values[field.id] || ""}
                onChange={(e) => onChange(field.id, e.target.value)}
              />
            </label>
          );
        }

        if (field.type === "select") {
          return (
            <label key={field.id} className="booking-field">
              {label}
              <select
                required={field.required}
                className="booking-field-input"
                value={values[field.id] || ""}
                onChange={(e) => onChange(field.id, e.target.value)}
              >
                <option value="">{placeholderFor(field)}</option>
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
          <label key={field.id} className="booking-field">
            {label}
            <input
              required={field.required}
              placeholder={placeholderFor(field)}
              className="booking-field-input"
              value={values[field.id] || ""}
              onChange={(e) => onChange(field.id, e.target.value)}
            />
          </label>
        );
      })}
    </div>
  );
}
