"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AgendadorFunnelStepPreview,
  type FunnelPreviewStep,
  type PreviewProfessional,
  type PreviewService,
} from "@/components/admin/AgendadorFunnelStepPreview";
import { BookingWelcomeHero } from "@/components/booking/BookingWelcomeHero";
import type {
  FunnelConfig,
  FormFieldConfig,
} from "@/types/funnel-config";

type Props = {
  pageId: string;
  title: string;
  description: string;
  coverImageUrl: string | null;
  orgLogoUrl: string | null;
  orgAccent: string;
  publicUrl: string;
  showShareActions?: boolean;
  services: PreviewService[];
  businessMode: "SOLO" | "SALON";
  demoPayments: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCoverFile: (file: File | null) => void;
  onRemoveCover: () => void;
  onServiceChange: (id: string, patch: Partial<PreviewService>) => void;
  onServiceImageFile: (id: string, file: File | null) => void;
  onSaveAll: () => Promise<{ ok: boolean; error?: string }>;
};

function newId() {
  return `b_${Date.now().toString(36)}`;
}

export function AgendadorWelcomeEditor({
  pageId,
  title,
  description,
  coverImageUrl,
  orgLogoUrl,
  orgAccent,
  publicUrl,
  showShareActions = true,
  services,
  businessMode,
  demoPayments,
  onTitleChange,
  onDescriptionChange,
  onCoverFile,
  onRemoveCover,
  onServiceChange,
  onServiceImageFile,
  onSaveAll,
}: Props) {
  const [previewStep, setPreviewStep] = useState<FunnelPreviewStep>("welcome");
  const [previewService, setPreviewService] = useState<PreviewService | null>(
    null,
  );
  const [funnelConfig, setFunnelConfig] = useState<FunnelConfig | null>(null);
  const [funnelLoading, setFunnelLoading] = useState(true);
  const [professionals, setProfessionals] = useState<PreviewProfessional[]>(
    [],
  );
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{
    tone: "ok" | "err";
    text: string;
  } | null>(null);
  const funnelAutosaveSkip = useRef(true);

  const loadFunnel = useCallback(() => {
    setFunnelLoading(true);
    fetch(`/api/pages/${pageId}/funnel`)
      .then((r) => r.json())
      .then((data) => setFunnelConfig(data.config))
      .finally(() => setFunnelLoading(false));
  }, [pageId]);

  useEffect(() => {
    loadFunnel();
  }, [loadFunnel]);

  useEffect(() => {
    if (businessMode !== "SALON") return;
    fetch("/api/professionals")
      .then((r) => r.json())
      .then((rows) => {
        if (!Array.isArray(rows)) return;
        setProfessionals(
          rows.map(
            (p: {
              id: string;
              displayName: string;
              photoUrl?: string | null;
            }) => ({
              id: p.id,
              displayName: p.displayName,
              photoUrl: p.photoUrl ?? null,
            }),
          ),
        );
      })
      .catch(() => setProfessionals([]));
  }, [businessMode]);

  const previewSteps = useMemo(() => {
    const steps: { id: FunnelPreviewStep; label: string }[] = [
      { id: "welcome", label: "Início" },
      { id: "service", label: "Serviço" },
    ];
    if (businessMode === "SALON") {
      steps.push({ id: "professional", label: "Profissional" });
    }
    steps.push(
      { id: "datetime", label: "Horário" },
      { id: "details", label: "Dados" },
    );
    if (!demoPayments) {
      steps.push({ id: "payment", label: "Pagamento" });
    }
    steps.push({ id: "done", label: "Confirmação" });
    return steps;
  }, [businessMode, demoPayments]);

  const stepIndex = previewSteps.findIndex((s) => s.id === previewStep);

  const activeServicesList = useMemo(
    () => services.filter((s) => s.isActive),
    [services],
  );

  useEffect(() => {
    if (!previewService) return;
    const updated = services.find((s) => s.id === previewService.id);
    if (updated) setPreviewService(updated);
  }, [services, previewService?.id]);

  const canPreviewGoBack =
    previewStep !== "welcome" && previewStep !== "done";

  function startPreviewBooking() {
    if (activeServicesList.length <= 1) {
      const s = activeServicesList[0] ?? null;
      setPreviewService(s);
      if (businessMode === "SALON") setPreviewStep("professional");
      else setPreviewStep("datetime");
      return;
    }
    setPreviewStep("service");
  }

  function pickPreviewService(service: PreviewService) {
    setPreviewService(service);
    if (businessMode === "SALON") setPreviewStep("professional");
    else setPreviewStep("datetime");
  }

  function goPreviewBack() {
    switch (previewStep) {
      case "service":
        setPreviewStep("welcome");
        break;
      case "professional":
        if (activeServicesList.length <= 1) setPreviewStep("welcome");
        else setPreviewStep("service");
        break;
      case "datetime":
        if (businessMode === "SALON") setPreviewStep("professional");
        else if (activeServicesList.length <= 1) setPreviewStep("welcome");
        else setPreviewStep("service");
        break;
      case "details":
        setPreviewStep("datetime");
        break;
      case "payment":
        setPreviewStep("details");
        break;
      default:
        break;
    }
  }

  function restartPreview() {
    setPreviewService(null);
    setPreviewStep("welcome");
  }

  function goStep(dir: -1 | 1) {
    const next = stepIndex + dir;
    if (next < 0 || next >= previewSteps.length) return;
    setPreviewStep(previewSteps[next].id);
  }

  const sortedFields = funnelConfig
    ? [...funnelConfig.formFields].sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  function updateFormFields(formFields: FormFieldConfig[]) {
    if (!funnelConfig) return;
    setFunnelConfig({ ...funnelConfig, formFields });
  }

  function moveField(index: number, dir: -1 | 1) {
    if (!funnelConfig) return;
    const sorted = [...funnelConfig.formFields].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    const j = index + dir;
    if (j < 0 || j >= sorted.length) return;
    const a = sorted[index];
    const b = sorted[j];
    updateFormFields(
      funnelConfig.formFields.map((f) => {
        if (f.id === a.id) return { ...f, sortOrder: b.sortOrder };
        if (f.id === b.id) return { ...f, sortOrder: a.sortOrder };
        return f;
      }),
    );
  }

  function addCustomField() {
    if (!funnelConfig) return;
    const id = newId();
    const maxOrder = Math.max(
      0,
      ...funnelConfig.formFields.map((f) => f.sortOrder),
    );
    const field: FormFieldConfig = {
      id,
      label: "Campo personalizado",
      type: "text",
      required: false,
      enabled: true,
      sortOrder: maxOrder + 1,
    };
    updateFormFields([...funnelConfig.formFields, field]);
    setEditingFieldId(id);
  }

  useEffect(() => {
    funnelAutosaveSkip.current = true;
  }, [pageId]);

  const persistFunnel = useCallback(
    async (config: FunnelConfig): Promise<{ ok: boolean; error?: string }> => {
      const payload: FunnelConfig = {
        ...config,
        theme: {
          ...config.theme,
          heroTitle: title,
          heroSubtitle: description || undefined,
          accentColor: orgAccent,
          logoUrl: orgLogoUrl || undefined,
        },
      };
      const res = await fetch(`/api/pages/${pageId}/funnel`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          ok: false,
          error:
            (data as { error?: string }).error ||
            "Não foi possível salvar o funil",
        };
      }
      funnelAutosaveSkip.current = true;
      setFunnelConfig(payload);
      return { ok: true };
    },
    [pageId, title, description, orgAccent, orgLogoUrl],
  );

  async function handleSaveAll() {
    if (!funnelConfig || saving) return;
    setSaving(true);
    setSaveFeedback(null);
    try {
      const funnelResult = await persistFunnel(funnelConfig);
      if (!funnelResult.ok) {
        setSaveFeedback({
          tone: "err",
          text: funnelResult.error || "Não foi possível salvar",
        });
        return;
      }
      const pageResult = await onSaveAll();
      if (!pageResult.ok) {
        setSaveFeedback({
          tone: "err",
          text: pageResult.error || "Não foi possível salvar",
        });
        return;
      }
      setSaveFeedback({ tone: "ok", text: "Alterações salvas" });
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (funnelLoading || !funnelConfig) return;
    if (funnelAutosaveSkip.current) {
      funnelAutosaveSkip.current = false;
      return;
    }
    const snapshot = funnelConfig;
    const timer = window.setTimeout(() => {
      void persistFunnel(snapshot);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [funnelConfig, funnelLoading, persistFunnel]);

  const editingField = sortedFields.find((f) => f.id === editingFieldId);

  const stepHint = (() => {
    switch (previewStep) {
      case "welcome":
        return null;
      case "service":
        return activeServicesList.length === 0 ? (
          <>
            Cadastre serviços em{" "}
            <Link
              href="/app/servicos"
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              Serviços
            </Link>
            .
          </>
        ) : (
          "Edite serviços na prévia. Catálogo completo em Serviços."
        );
      case "professional":
        return (
          <>
            Equipe em{" "}
            <Link
              href="/app/profissionais"
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              Equipe
            </Link>
            .
          </>
        );
      case "datetime":
        return "Horários vêm da seção “Quando você atende?”.";
      case "payment":
        return (
          <>
            Pagamento online em{" "}
            <Link
              href="/app/conta"
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              Conta
            </Link>
            .
          </>
        );
      case "done":
        return "Tela após confirmar o agendamento.";
      default:
        return null;
    }
  })();

  return (
    <div
      className="overflow-hidden"
      style={{ "--accent": orgAccent } as React.CSSProperties}
    >
      <div className="flex flex-wrap items-center gap-2 px-1 pb-3">
        <div className="agendador-step-nav min-w-0 flex-1">
          <button
            type="button"
            className="agendador-step-nav-btn"
            aria-label="Etapa anterior"
            disabled={stepIndex <= 0}
            onClick={() => goStep(-1)}
          >
            ‹
          </button>
          <div
            className="agendador-step-tabs"
            role="tablist"
            aria-label="Telas do funil"
          >
            {previewSteps.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={previewStep === s.id}
                onClick={() => setPreviewStep(s.id)}
                className={`agendador-step-tab ${
                  previewStep === s.id ? "agendador-step-tab-active" : ""
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="agendador-step-nav-btn"
            aria-label="Próxima etapa"
            disabled={stepIndex >= previewSteps.length - 1}
            onClick={() => goStep(1)}
          >
            ›
          </button>
        </div>
        {(showShareActions || publicUrl) && (
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary !py-1.5 !text-xs"
          >
            Abrir
          </a>
        )}
      </div>

      <div className="agendador-preview-shell rounded-2xl">
        <div className="agendador-phone">
          <div className="agendador-phone-screen">
            <div
              className={`agendador-phone-topbar${
                previewStep === "welcome" ? " agendador-phone-topbar--dark" : ""
              }`}
              aria-hidden
            >
              <span className="agendador-phone-time">9:41</span>
              <span className="agendador-phone-island" />
              <div className="agendador-phone-status">
                <span className="agendador-phone-signal">
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
                <span className="agendador-phone-battery" />
                <span className="agendador-phone-battery-cap" />
              </div>
            </div>
            <div
              className={`agendador-phone-body${
                previewStep === "welcome" ? "" : " agendador-phone-body--safe"
              }`}
            >
              {previewStep === "welcome" ? (
                <BookingWelcomeHero
                  coverUrl={coverImageUrl}
                  logoUrl={orgLogoUrl}
                  accent={orgAccent}
                  title={title}
                  subtitle={description}
                  preview
                  editable
                  onCta={startPreviewBooking}
                  onTitleChange={onTitleChange}
                  onSubtitleChange={onDescriptionChange}
                  onCoverFile={onCoverFile}
                />
              ) : funnelConfig ? (
                <AgendadorFunnelStepPreview
                  step={previewStep}
                  accent={orgAccent}
                  logoUrl={orgLogoUrl}
                  title={title}
                  description={description}
                  services={services}
                  professionals={professionals}
                  blocks={funnelConfig.blocks}
                  formFields={funnelConfig.formFields}
                  demoPayments={demoPayments}
                  businessMode={businessMode}
                  selectedService={previewService}
                  canGoBack={canPreviewGoBack}
                  onGoBack={goPreviewBack}
                  onPickService={pickPreviewService}
                  onPickProfessional={() => setPreviewStep("datetime")}
                  onPickSlot={() => setPreviewStep("details")}
                  onConfirmDetails={() =>
                    setPreviewStep(demoPayments ? "done" : "payment")
                  }
                  onConfirmPayment={() => setPreviewStep("done")}
                  onRestart={restartPreview}
                  onServiceChange={onServiceChange}
                  onServiceImageFile={onServiceImageFile}
                />
              ) : (
                <p className="p-8 text-center text-sm text-muted">
                  Carregando…
                </p>
              )}
            </div>
            <div
              className={`agendador-phone-home${
                previewStep === "welcome" ? " agendador-phone-home--light" : ""
              }`}
              aria-hidden
            >
              <div className="agendador-phone-home-bar" />
            </div>
          </div>
        </div>
      </div>

      {stepHint && <p className="agendador-editor-hint mt-3">{stepHint}</p>}

      {previewStep === "welcome" && coverImageUrl && (
        <div className="mt-2 flex justify-center">
          <button
            type="button"
            className="text-xs font-medium text-muted hover:text-foreground"
            onClick={onRemoveCover}
          >
            Remover foto de capa
          </button>
        </div>
      )}

      {!funnelLoading && funnelConfig && previewStep === "details" && (
        <details className="agendador-disclosure mt-3" open>
          <summary>Campos do formulário</summary>
          <div className="agendador-disclosure-body space-y-3">
            <ul className="space-y-2">
              {sortedFields.map((field, i) => (
                <li
                  key={field.id}
                  className="rounded-lg border border-border bg-muted-bg/30"
                >
                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingFieldId((id) =>
                          id === field.id ? null : field.id,
                        )
                      }
                      className={`min-w-0 flex-1 text-left text-sm ${
                        field.enabled ? "" : "text-muted line-through"
                      }`}
                    >
                      {field.label}
                      {field.required && field.enabled && (
                        <span className="ml-1 text-xs text-muted">*</span>
                      )}
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      {field.preset !== "customerName" && (
                        <label className="flex items-center gap-1 text-[11px] text-muted">
                          <input
                            type="checkbox"
                            checked={field.enabled}
                            onChange={(e) =>
                              updateFormFields(
                                funnelConfig.formFields.map((f) =>
                                  f.id === field.id
                                    ? { ...f, enabled: e.target.checked }
                                    : f,
                                ),
                              )
                            }
                          />
                          Ativo
                        </label>
                      )}
                      <button
                        type="button"
                        className="px-1 text-muted hover:text-foreground"
                        onClick={() => moveField(i, -1)}
                        aria-label="Subir"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="px-1 text-muted hover:text-foreground"
                        onClick={() => moveField(i, 1)}
                        aria-label="Descer"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                  {editingFieldId === field.id && editingField && (
                    <div className="space-y-3 border-t border-border px-3 py-3">
                      <label className="block text-sm">
                        <span className="mb-1 block text-xs text-muted">
                          Rótulo
                        </span>
                        <input
                          className="input-field text-sm"
                          value={editingField.label}
                          disabled={
                            !!editingField.preset &&
                            editingField.preset !== "message"
                          }
                          onChange={(e) =>
                            updateFormFields(
                              funnelConfig.formFields.map((f) =>
                                f.id === field.id
                                  ? { ...f, label: e.target.value }
                                  : f,
                              ),
                            )
                          }
                        />
                      </label>
                      {editingField.preset !== "customerName" && (
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={editingField.required}
                            onChange={(e) =>
                              updateFormFields(
                                funnelConfig.formFields.map((f) =>
                                  f.id === field.id
                                    ? { ...f, required: e.target.checked }
                                    : f,
                                ),
                              )
                            }
                          />
                          Obrigatório
                        </label>
                      )}
                      {editingField.type === "select" && (
                        <label className="block text-sm">
                          <span className="mb-1 block text-xs text-muted">
                            Opções (uma por linha)
                          </span>
                          <textarea
                            rows={3}
                            className="input-field text-xs"
                            value={(editingField.options || []).join("\n")}
                            onChange={(e) =>
                              updateFormFields(
                                funnelConfig.formFields.map((f) =>
                                  f.id === field.id
                                    ? {
                                        ...f,
                                        options: e.target.value
                                          .split("\n")
                                          .filter(Boolean),
                                      }
                                    : f,
                                ),
                              )
                            }
                          />
                        </label>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={addCustomField}
              className="text-xs font-medium text-muted hover:text-foreground"
            >
              + Campo personalizado
            </button>
          </div>
        </details>
      )}

      {funnelLoading && (
        <p className="mt-3 text-center text-sm text-muted">
          Carregando…
        </p>
      )}

      {!funnelLoading && funnelConfig && (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
          {saveFeedback ? (
            <p
              className={`text-sm ${
                saveFeedback.tone === "err" ? "text-danger" : "text-emerald-800"
              }`}
            >
              {saveFeedback.text}
            </p>
          ) : (
            <span />
          )}
          <button
            type="button"
            className="btn-primary shrink-0"
            disabled={saving}
            onClick={() => void handleSaveAll()}
          >
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      )}
    </div>
  );
}
