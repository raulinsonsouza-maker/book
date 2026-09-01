"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  companyOpeningBrTemplate,
  defaultPartner,
  MARITAL_STATUS_LABELS,
} from "@/lib/intake/templates/company-opening-br";
import { validateIntakeStep } from "@/lib/intake/validation/company-opening-br";
import { requiredIntakeFileFields } from "@/lib/intake/required-files";
import type { CompanyOpeningBrData, IntakeAttachmentInfo } from "@/lib/intake/types";
import { IntakeFileField } from "@/components/intake/IntakeFileField";

const WIZARD_STEPS = companyOpeningBrTemplate.steps.filter((s) => s.id !== "payment");

type Props = {
  checkoutSlug: string;
  accentColor?: string;
  onReadyForPayment: (orderId: string) => void;
};

export function IntakeWizard({ checkoutSlug, accentColor = "#0a0a0a", onReadyForPayment }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<CompanyOpeningBrData>(
    companyOpeningBrTemplate.defaultData(),
  );
  const [orderId, setOrderId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Record<string, IntakeAttachmentInfo>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const currentStep = WIZARD_STEPS[stepIndex]!;
  const progress = ((stepIndex + 1) / WIZARD_STEPS.length) * 100;

  const fileFields = useMemo(() => requiredIntakeFileFields(data), [data]);

  const saveDraft = useCallback(
    async (opts?: { submit?: boolean }) => {
      setSaving(true);
      setError("");
      const res = await fetch(`/api/public/checkout/${checkoutSlug}/intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderId || undefined,
          stepId: currentStep.id,
          data,
          submit: opts?.submit,
        }),
      });
      const json = await res.json();
      setSaving(false);
      if (!res.ok) {
        setError(json.error || "Erro ao salvar");
        return false;
      }
      setOrderId(json.orderId);
      if (opts?.submit && json.orderId) {
        onReadyForPayment(json.orderId);
      }
      return true;
    },
    [checkoutSlug, currentStep.id, data, onReadyForPayment, orderId],
  );

  useEffect(() => {
    if (!orderId) return;
    fetch(`/api/public/checkout/${checkoutSlug}/intake?orderId=${orderId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setData({ ...companyOpeningBrTemplate.defaultData(), ...json.data });
        if (json.attachments) {
          const map: Record<string, IntakeAttachmentInfo> = {};
          for (const a of json.attachments as IntakeAttachmentInfo[]) {
            map[a.fieldKey] = a;
          }
          setAttachments(map);
        }
      })
      .catch(() => undefined);
  }, [checkoutSlug, orderId]);

  function updatePartner(index: number, patch: Partial<CompanyOpeningBrData["partners"][0]>) {
    setData((prev) => {
      const partners = [...prev.partners];
      partners[index] = { ...partners[index]!, ...patch };
      return { ...prev, partners };
    });
  }

  function removePartner(index: number) {
    setData((prev) => {
      const partners = prev.partners.filter((_, i) => i !== index);
      const count = Math.max(1, partners.length);
      const equal = Math.floor((100 / count) * 100) / 100;
      const ownership = partners.map((_, i) => ({
        partnerIndex: i,
        percentage: i === 0 ? 100 - equal * (count - 1) : equal,
      }));
      return {
        ...prev,
        partners,
        ownership,
        administration: {
          ...prev.administration,
          administratorPartnerIndices: [0],
        },
      };
    });
  }

  useEffect(() => {
    if (currentStep.id === "documents" && !orderId && !saving) {
      void saveDraft();
    }
  }, [currentStep.id, orderId, saving, saveDraft]);

  async function next() {
    const check = validateIntakeStep(currentStep.id, data);
    if (!check.ok) {
      setError(check.message);
      return;
    }
    setError("");
    const ok = await saveDraft();
    if (!ok) return;
    if (stepIndex < WIZARD_STEPS.length - 1) {
      setStepIndex((i) => i + 1);
    }
  }

  async function submitAndPay() {
    const missing = fileFields.filter((f) => f.required && !attachments[f.key]);
    if (missing.length > 0) {
      setError(`Envie todos os documentos obrigatórios (${missing.length} pendente${missing.length > 1 ? "s" : ""})`);
      return;
    }
    setError("");
    await saveDraft({ submit: true });
  }

  function back() {
    setError("");
    setStepIndex((i) => Math.max(0, i - 1));
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-muted">
          <span>
            Etapa {stepIndex + 1} de {WIZARD_STEPS.length} — {currentStep.title}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${progress}%`, backgroundColor: accentColor }}
          />
        </div>
        {currentStep.description && (
          <p className="mt-2 text-sm text-muted">{currentStep.description}</p>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {currentStep.id === "partners" && (
        <div className="space-y-6">
          {data.partners.map((partner, index) => (
            <div key={index} className="surface space-y-3 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Sócio {index + 1}</h3>
                {data.partners.length > 1 && (
                  <button
                    type="button"
                    className="text-xs text-danger"
                    onClick={() => removePartner(index)}
                  >
                    Remover
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nome completo" required>
                  <input
                    className="input-field"
                    value={partner.fullName}
                    onChange={(e) => updatePartner(index, { fullName: e.target.value })}
                  />
                </Field>
                <Field label="CPF" required>
                  <input
                    className="input-field"
                    value={partner.cpf}
                    onChange={(e) => updatePartner(index, { cpf: e.target.value })}
                  />
                </Field>
                <Field label="RG ou CNH" required>
                  <input
                    className="input-field"
                    value={partner.rgOrCnh}
                    onChange={(e) => updatePartner(index, { rgOrCnh: e.target.value })}
                  />
                </Field>
                <Field label="Data de nascimento" required>
                  <input
                    type="date"
                    className="input-field"
                    value={partner.birthDate}
                    onChange={(e) => updatePartner(index, { birthDate: e.target.value })}
                  />
                </Field>
                <Field label="Nacionalidade" required>
                  <input
                    className="input-field"
                    value={partner.nationality}
                    onChange={(e) => updatePartner(index, { nationality: e.target.value })}
                  />
                </Field>
                <Field label="Estado civil" required>
                  <select
                    className="input-field"
                    value={partner.maritalStatus}
                    onChange={(e) =>
                      updatePartner(index, {
                        maritalStatus: e.target.value as typeof partner.maritalStatus,
                      })
                    }
                  >
                    {Object.entries(MARITAL_STATUS_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>
                {(partner.maritalStatus === "married" ||
                  partner.maritalStatus === "stable_union") && (
                  <Field label="Regime de casamento" required className="sm:col-span-2">
                    <input
                      className="input-field"
                      value={partner.marriageRegime || ""}
                      onChange={(e) =>
                        updatePartner(index, { marriageRegime: e.target.value })
                      }
                    />
                  </Field>
                )}
                <Field label="Profissão" required>
                  <input
                    className="input-field"
                    value={partner.profession}
                    onChange={(e) => updatePartner(index, { profession: e.target.value })}
                  />
                </Field>
                <Field label="CEP" required>
                  <input
                    className="input-field"
                    value={partner.zipCode}
                    onChange={(e) => updatePartner(index, { zipCode: e.target.value })}
                  />
                </Field>
                <Field label="Endereço completo" required className="sm:col-span-2">
                  <input
                    className="input-field"
                    value={partner.address}
                    onChange={(e) => updatePartner(index, { address: e.target.value })}
                  />
                </Field>
                <Field label="E-mail" required>
                  <input
                    type="email"
                    className="input-field"
                    value={partner.email}
                    onChange={(e) => updatePartner(index, { email: e.target.value })}
                  />
                </Field>
                <Field label="Celular" required>
                  <input
                    className="input-field"
                    value={partner.phone}
                    onChange={(e) => updatePartner(index, { phone: e.target.value })}
                  />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={partner.cpfOnIdDoc}
                  onChange={(e) =>
                    updatePartner(index, { cpfOnIdDoc: e.target.checked })
                  }
                />
                CPF consta no documento de identidade (dispensa upload separado)
              </label>
            </div>
          ))}
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={() => {
              setData((prev) => {
                const partners = [...prev.partners, defaultPartner()];
                const count = partners.length;
                const equal = Math.floor((100 / count) * 100) / 100;
                const ownership = partners.map((_, i) => ({
                  partnerIndex: i,
                  percentage: i === 0 ? 100 - equal * (count - 1) : equal,
                }));
                return {
                  ...prev,
                  partners,
                  ownership,
                };
              });
            }}
          >
            + Adicionar sócio
          </button>
        </div>
      )}

      {currentStep.id === "company" && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Field key={i} label={`${i + 1}ª opção de razão social`} required>
              <input
                className="input-field"
                value={data.companyNameOptions[i]}
                onChange={(e) => {
                  const opts = [...data.companyNameOptions] as [string, string, string];
                  opts[i] = e.target.value;
                  setData({ ...data, companyNameOptions: opts });
                }}
              />
            </Field>
          ))}
          <Field label="Nome fantasia" required>
            <input
              className="input-field"
              value={data.tradeName}
              onChange={(e) => setData({ ...data, tradeName: e.target.value })}
            />
          </Field>
          <Field label="Razão social preferida" required>
            <input
              className="input-field"
              value={data.preferredLegalName}
              onChange={(e) => setData({ ...data, preferredLegalName: e.target.value })}
            />
          </Field>
        </div>
      )}

      {currentStep.id === "capital" && (
        <Field label="Capital social (R$)" required>
          <input
            className="input-field max-w-xs"
            placeholder="Ex: 10000,00"
            value={data.shareCapitalReais}
            onChange={(e) => setData({ ...data, shareCapitalReais: e.target.value })}
          />
        </Field>
      )}

      {currentStep.id === "ownership" && (
        <div className="space-y-3">
          {data.partners.map((p, index) => (
            <Field key={index} label={`${p.fullName || `Sócio ${index + 1}`} (%)`} required>
              <input
                type="number"
                min={0}
                max={100}
                className="input-field max-w-xs"
                value={data.ownership.find((o) => o.partnerIndex === index)?.percentage ?? 0}
                onChange={(e) => {
                  const pct = Number(e.target.value);
                  setData((prev) => {
                    const ownership = prev.ownership.filter((o) => o.partnerIndex !== index);
                    ownership.push({ partnerIndex: index, percentage: pct });
                    ownership.sort((a, b) => a.partnerIndex - b.partnerIndex);
                    return { ...prev, ownership };
                  });
                }}
              />
            </Field>
          ))}
          <p className="text-xs text-muted">
            Total:{" "}
            {data.ownership.reduce((s, o) => s + o.percentage, 0).toFixed(2)}% (deve ser 100%)
          </p>
        </div>
      )}

      {currentStep.id === "administration" && (
        <div className="space-y-4">
          <Field label="Modo de administração" required>
            <select
              className="input-field max-w-md"
              value={data.administration.mode}
              onChange={(e) =>
                setData({
                  ...data,
                  administration: {
                    ...data.administration,
                    mode: e.target.value as "sole" | "joint",
                  },
                })
              }
            >
              <option value="sole">Isolada</option>
              <option value="joint">Conjunta</option>
            </select>
          </Field>
          <div className="space-y-2">
            <p className="text-sm font-medium">Quem administra?</p>
            {data.partners.map((p, index) => (
              <label key={index} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={data.administration.administratorPartnerIndices.includes(index)}
                  onChange={(e) => {
                    setData((prev) => {
                      let indices = [...prev.administration.administratorPartnerIndices];
                      if (e.target.checked) indices.push(index);
                      else indices = indices.filter((i) => i !== index);
                      return {
                        ...prev,
                        administration: {
                          ...prev.administration,
                          administratorPartnerIndices: indices,
                        },
                      };
                    });
                  }}
                />
                {p.fullName || `Sócio ${index + 1}`}
              </label>
            ))}
          </div>
        </div>
      )}

      {currentStep.id === "activities" && (
        <Field label="Atividades / objeto social" required>
          <textarea
            className="input-field min-h-32"
            value={data.activities}
            onChange={(e) => setData({ ...data, activities: e.target.value })}
            placeholder="Descreva detalhadamente as atividades da empresa"
          />
        </Field>
      )}

      {currentStep.id === "headquarters" && (
        <div className="space-y-3">
          <Field label="CEP da sede" required>
            <input
              className="input-field max-w-xs"
              value={data.headquarters.zipCode}
              onChange={(e) =>
                setData({
                  ...data,
                  headquarters: { ...data.headquarters, zipCode: e.target.value },
                })
              }
            />
          </Field>
          <Field label="Endereço completo da sede" required>
            <input
              className="input-field"
              value={data.headquarters.address}
              onChange={(e) =>
                setData({
                  ...data,
                  headquarters: { ...data.headquarters, address: e.target.value },
                })
              }
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={data.headquarters.isRented}
              onChange={(e) =>
                setData({
                  ...data,
                  headquarters: { ...data.headquarters, isRented: e.target.checked },
                })
              }
            />
            Imóvel alugado (será solicitado contrato ou autorização)
          </label>
        </div>
      )}

      {currentStep.id === "documents" && (
        <div className="space-y-3">
          {!orderId && (
            <p className="text-sm text-muted">
              Salvando rascunho para liberar uploads…
            </p>
          )}
          {fileFields.map((field) => (
            <IntakeFileField
              key={field.key}
              fieldKey={field.key}
              label={field.label}
              hint={field.hint}
              required={field.required}
              checkoutSlug={checkoutSlug}
              orderId={orderId}
              attachment={attachments[field.key]}
              onUploaded={(info) =>
                setAttachments((prev) => ({
                  ...prev,
                  [field.key]: { ...info, partnerIndex: info.partnerIndex ?? null },
                }))
              }
              onRemoved={() =>
                setAttachments((prev) => {
                  const next = { ...prev };
                  delete next[field.key];
                  return next;
                })
              }
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        {stepIndex > 0 && (
          <button type="button" className="btn-secondary" onClick={back} disabled={saving}>
            Voltar
          </button>
        )}
        {currentStep.id !== "documents" ? (
          <button
            type="button"
            className="btn-primary"
            style={{ backgroundColor: accentColor }}
            disabled={saving}
            onClick={() => void next()}
          >
            {saving ? "Salvando…" : "Continuar"}
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary"
            style={{ backgroundColor: accentColor }}
            disabled={saving || !orderId}
            onClick={() => void submitAndPay()}
          >
            {saving ? "Validando…" : "Ir para pagamento"}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1.5 block font-medium">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
