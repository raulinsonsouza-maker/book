"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import {
  AgendadorFunnelStepPreview,
  type FunnelPreviewStep,
  type PreviewProfessional,
  type PreviewService,
} from "@/components/admin/AgendadorFunnelStepPreview";
import { FunnelLandingBlocks } from "@/components/booking/FunnelLandingBlocks";
import type {
  FunnelBlock,
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
  const [previewService, setPreviewService] = useState<PreviewService | null>(null);
  const [funnelConfig, setFunnelConfig] = useState<FunnelConfig | null>(null);
  const [funnelLoading, setFunnelLoading] = useState(true);
  const [professionals, setProfessionals] = useState<PreviewProfessional[]>([]);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
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
          rows.map((p: { id: string; displayName: string; photoUrl?: string | null }) => ({
            id: p.id,
            displayName: p.displayName,
            photoUrl: p.photoUrl ?? null,
          })),
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

  const initials = (title.trim() || "NA").slice(0, 2).toUpperCase();

  const previewBlocks =
    funnelConfig?.blocks.filter((b) => b.type !== "image") ?? [];

  const sortedFields = funnelConfig
    ? [...funnelConfig.formFields].sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  function updateFormFields(formFields: FormFieldConfig[]) {
    if (!funnelConfig) return;
    setFunnelConfig({ ...funnelConfig, formFields });
  }

  function updateBlocks(blocks: FunnelBlock[]) {
    if (!funnelConfig) return;
    setFunnelConfig({ ...funnelConfig, blocks });
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

  function addBlock(type: FunnelBlock["type"]) {
    if (!funnelConfig) return;
    let block: FunnelBlock;
    const id = newId();
    if (type === "text") {
      block = { id, type: "text", content: "Novo texto", align: "left" };
    } else if (type === "image") {
      block = { id, type: "image", url: "", alt: "" };
    } else if (type === "divider") {
      block = { id, type: "divider" };
    } else {
      block = { id, type: "testimonial", quote: "", author: "" };
    }
    updateBlocks([...funnelConfig.blocks, block]);
    setEditingBlockId(id);
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
  }, [funnelConfig, funnelLoading, persistFunnel, title, description]);

  const editingField = sortedFields.find((f) => f.id === editingFieldId);

  const stepHint = (() => {
    switch (previewStep) {
      case "service":
        return activeServicesList.length === 0 ? (
          <>
            Cadastre serviços em{" "}
            <Link href="/app/servicos" className="font-medium text-foreground underline-offset-2 hover:underline">
              Serviços
            </Link>{" "}
            para editar aqui na prévia.
          </>
        ) : (
          "Edite nome, preço, duração e foto na prévia. Para adicionar ou desativar serviços, use Serviços."
        );
      case "professional":
        return (
          <>
            Equipe e fotos em{" "}
            <Link href="/app/profissionais" className="font-medium text-foreground underline-offset-2 hover:underline">
              Equipe
            </Link>
            .
          </>
        );
      case "datetime":
        return "Horários disponíveis vêm da seção “Quando você atende?” abaixo.";
      case "payment":
        return (
          <>
            Pagamento online em{" "}
            <Link href="/app/conta" className="font-medium text-foreground underline-offset-2 hover:underline">
              Conta
            </Link>
            . Sem gateway, o cliente confirma direto na etapa Dados.
          </>
        );
      case "done":
        return "Tela automática após confirmar o agendamento.";
      default:
        return null;
    }
  })();

  return (
    <section className="surface overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-border px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            Funil de agendamento
          </h2>
          <p className="mt-1 text-xs text-muted">
            Clique na prévia como um cliente ou use as abas. Logo e cores em{" "}
            <Link
              href="/app/conta"
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              Conta
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <CopyLinkButton url={publicUrl} />
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
          >
            Abrir prévia
          </a>
        </div>
      </div>

      <div className="border-b border-border px-4 py-3 sm:px-6">
        <div className="agendador-step-tabs" role="tablist" aria-label="Telas do funil">
          {previewSteps.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={previewStep === s.id}
              onClick={() => setPreviewStep(s.id)}
              className={`agendador-step-tab ${previewStep === s.id ? "agendador-step-tab-active" : ""}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="agendador-preview-shell p-4 sm:p-6"
        style={{ "--accent": orgAccent } as React.CSSProperties}
      >
        <div className="agendador-preview-frame mx-auto max-w-xl overflow-hidden">
          {previewStep === "welcome" ? (
            <div className="booking-card booking-welcome-card !rounded-none !border-0 !shadow-none">
              <div className="booking-welcome-split">
                <label className="booking-welcome-media agendador-welcome-media-editable">
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      onCoverFile(e.target.files?.[0] ?? null);
                      e.target.value = "";
                    }}
                  />
                  {coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverImageUrl}
                      alt=""
                      className="booking-welcome-photo"
                    />
                  ) : orgLogoUrl ? (
                    <div className="booking-welcome-logo-wrap">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={orgLogoUrl} alt="" className="booking-welcome-logo" />
                    </div>
                  ) : (
                    <div
                      className="booking-welcome-fallback"
                      style={{ background: orgAccent }}
                    >
                      {initials}
                    </div>
                  )}
                  <span className="agendador-welcome-media-hint">
                    {coverImageUrl ? "Trocar foto" : "Enviar foto"}
                  </span>
                </label>

                <div className="booking-welcome-body">
                  <label className="agendador-preview-field">
                    <span className="agendador-preview-field-label">Nome</span>
                    <input
                      value={title}
                      onChange={(e) => onTitleChange(e.target.value)}
                      placeholder="Ex.: Barbearia do Raul"
                      className="agendador-preview-title"
                    />
                  </label>
                  <label className="agendador-preview-field mt-3">
                    <span className="agendador-preview-field-label">
                      Texto de apoio
                    </span>
                    <textarea
                      value={description}
                      onChange={(e) => onDescriptionChange(e.target.value)}
                      placeholder="Explique o que o cliente encontra ao agendar"
                      rows={3}
                      className="agendador-preview-desc"
                    />
                  </label>

                  {previewBlocks.length > 0 && (
                    <div className="mt-3 border-t border-border pt-3">
                      <FunnelLandingBlocks blocks={previewBlocks} />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={startPreviewBooking}
                    className="btn-primary mt-4 w-full !rounded-xl !py-3 text-[0.9375rem] sm:w-auto sm:min-w-[11rem]"
                  >
                    Iniciar agendamento
                  </button>
                </div>
              </div>
            </div>
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
            <p className="p-8 text-center text-sm text-muted">Carregando…</p>
          )}
        </div>
      </div>

      {!funnelLoading && funnelConfig && previewStep === "welcome" && (
        <div className="space-y-3 border-t border-border p-6">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Conteúdo extra</h3>
            <p className="mt-1 text-xs text-muted">
              Textos e depoimentos na tela inicial (opcional).
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["text", "Texto"],
                ["testimonial", "Depoimento"],
                ["divider", "Linha"],
              ] as const
            ).map(([type, label]) => (
              <button
                key={type}
                type="button"
                onClick={() => addBlock(type)}
                className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-muted-bg"
              >
                + {label}
              </button>
            ))}
          </div>
          {funnelConfig.blocks.length === 0 ? (
            <p className="text-xs text-muted">Nenhum bloco adicionado.</p>
          ) : (
            <ul className="space-y-2">
              {funnelConfig.blocks.map((block) => (
                <li
                  key={block.id}
                  className="rounded-lg border border-border bg-muted-bg/30"
                >
                  <div className="flex items-center justify-between px-3 py-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingBlockId((id) =>
                          id === block.id ? null : block.id,
                        )
                      }
                      className="min-w-0 flex-1 text-left text-xs font-medium"
                    >
                      {block.type === "text"
                        ? "Texto"
                        : block.type === "testimonial"
                          ? "Depoimento"
                          : block.type === "divider"
                            ? "Linha"
                            : "Imagem"}
                    </button>
                    <span className="text-xs text-muted">
                      {editingBlockId === block.id ? "Fechar" : "Editar"}
                    </span>
                  </div>
                  {editingBlockId === block.id && (
                    <div className="space-y-3 border-t border-border px-3 py-3">
                      {block.type === "text" && (
                        <>
                          <textarea
                            rows={3}
                            className="input-field text-sm"
                            value={block.content}
                            onChange={(e) =>
                              updateBlocks(
                                funnelConfig.blocks.map((b) =>
                                  b.id === block.id && b.type === "text"
                                    ? { ...b, content: e.target.value }
                                    : b,
                                ),
                              )
                            }
                          />
                          <select
                            className="input-field text-sm"
                            value={block.align || "left"}
                            onChange={(e) =>
                              updateBlocks(
                                funnelConfig.blocks.map((b) =>
                                  b.id === block.id && b.type === "text"
                                    ? {
                                        ...b,
                                        align: e.target.value as "left" | "center",
                                      }
                                    : b,
                                ),
                              )
                            }
                          >
                            <option value="left">Esquerda</option>
                            <option value="center">Centro</option>
                          </select>
                        </>
                      )}
                      {block.type === "testimonial" && (
                        <>
                          <textarea
                            rows={2}
                            placeholder="Depoimento"
                            className="input-field text-sm"
                            value={block.quote}
                            onChange={(e) =>
                              updateBlocks(
                                funnelConfig.blocks.map((b) =>
                                  b.id === block.id && b.type === "testimonial"
                                    ? { ...b, quote: e.target.value }
                                    : b,
                                ),
                              )
                            }
                          />
                          <input
                            placeholder="Autor"
                            className="input-field text-sm"
                            value={block.author}
                            onChange={(e) =>
                              updateBlocks(
                                funnelConfig.blocks.map((b) =>
                                  b.id === block.id && b.type === "testimonial"
                                    ? { ...b, author: e.target.value }
                                    : b,
                                ),
                              )
                            }
                          />
                        </>
                      )}
                      {block.type === "divider" && (
                        <p className="text-xs text-muted">Linha divisória na página.</p>
                      )}
                      <button
                        type="button"
                        className="text-xs font-medium text-danger hover:underline"
                        onClick={() => {
                          updateBlocks(
                            funnelConfig.blocks.filter((b) => b.id !== block.id),
                          );
                          setEditingBlockId(null);
                        }}
                      >
                        Remover bloco
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!funnelLoading && funnelConfig && previewStep === "details" && (
        <div className="space-y-3 border-t border-border p-6">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">
              Campos do formulário
            </h3>
            <p className="mt-1 text-xs text-muted">
              Edite o que o cliente preenche nesta tela.
            </p>
          </div>
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
                      <span className="mb-1 block text-xs text-muted">Rótulo</span>
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
      )}

      {stepHint && (
        <p className="border-t border-border px-6 py-4 text-xs text-muted">{stepHint}</p>
      )}

      {previewStep === "welcome" && coverImageUrl && (
        <div className="border-t border-border px-6 py-3 text-right">
          <button
            type="button"
            onClick={onRemoveCover}
            className="text-xs font-medium text-muted underline-offset-2 hover:text-foreground hover:underline"
          >
            Remover foto
          </button>
        </div>
      )}

      {funnelLoading && (
        <p className="border-t border-border p-6 text-sm text-muted">
          Carregando configuração do funil…
        </p>
      )}

      {!funnelLoading && funnelConfig && (
        <div className="flex flex-col gap-3 border-t border-border bg-muted-bg/25 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          {saveFeedback ? (
            <p
              className={`text-sm ${
                saveFeedback.tone === "err" ? "text-danger" : "text-emerald-800"
              }`}
            >
              {saveFeedback.text}
            </p>
          ) : (
            <p className="text-xs text-muted">
              Salve para garantir que nome, serviços e funil foram aplicados.
            </p>
          )}
          <button
            type="button"
            className="btn-primary shrink-0 sm:ml-auto"
            disabled={saving}
            onClick={() => void handleSaveAll()}
          >
            {saving ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      )}
    </section>
  );
}
