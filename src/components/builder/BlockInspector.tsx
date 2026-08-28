"use client";

import type { FunnelBlock, FormFieldConfig } from "@/types/funnel-config";

type Selection =
  | { kind: "field"; id: string }
  | { kind: "block"; id: string }
  | { kind: "theme" }
  | null;

type Props = {
  selection: Selection;
  formFields: FormFieldConfig[];
  blocks: FunnelBlock[];
  theme: {
    accentColor: string;
    logoUrl?: string;
    heroTitle?: string;
    heroSubtitle?: string;
  };
  onFormFieldsChange: (fields: FormFieldConfig[]) => void;
  onBlocksChange: (blocks: FunnelBlock[]) => void;
  onThemeChange: (theme: Props["theme"]) => void;
  onSelect: (s: Selection) => void;
};

export function BlockInspector({
  selection,
  formFields,
  blocks,
  theme,
  onFormFieldsChange,
  onBlocksChange,
  onThemeChange,
}: Props) {
  if (!selection) {
    return (
      <p className="p-4 text-sm text-muted">
        Selecione um campo, bloco ou branding para editar.
      </p>
    );
  }

  if (selection.kind === "theme") {
    return (
      <div className="space-y-4 p-4">
        <h3 className="text-sm font-semibold">Branding</h3>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Cor de destaque</span>
          <input
            type="color"
            className="h-10 w-full rounded-lg border border-border"
            value={theme.accentColor}
            onChange={(e) => onThemeChange({ ...theme, accentColor: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Logo (URL)</span>
          <input
            className="input-field text-xs"
            value={theme.logoUrl || ""}
            onChange={(e) => onThemeChange({ ...theme, logoUrl: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Título</span>
          <input
            className="input-field"
            value={theme.heroTitle || ""}
            onChange={(e) => onThemeChange({ ...theme, heroTitle: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Subtítulo</span>
          <textarea
            rows={3}
            className="input-field"
            value={theme.heroSubtitle || ""}
            onChange={(e) => onThemeChange({ ...theme, heroSubtitle: e.target.value })}
          />
        </label>
      </div>
    );
  }

  if (selection.kind === "field") {
    const field = formFields.find((f) => f.id === selection.id);
    if (!field) return null;
    const locked = field.preset === "customerName";

    return (
      <div className="space-y-4 p-4">
        <h3 className="text-sm font-semibold">Campo</h3>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Label</span>
          <input
            className="input-field"
            value={field.label}
            disabled={!!field.preset && field.preset !== "message"}
            onChange={(e) =>
              onFormFieldsChange(
                formFields.map((f) =>
                  f.id === field.id ? { ...f, label: e.target.value } : f,
                ),
              )
            }
          />
        </label>
        {!locked && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={field.enabled}
              onChange={(e) =>
                onFormFieldsChange(
                  formFields.map((f) =>
                    f.id === field.id ? { ...f, enabled: e.target.checked } : f,
                  ),
                )
              }
            />
            Exibir no formulário
          </label>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={field.required}
            disabled={locked}
            onChange={(e) =>
              onFormFieldsChange(
                formFields.map((f) =>
                  f.id === field.id ? { ...f, required: e.target.checked } : f,
                ),
              )
            }
          />
          Obrigatório
        </label>
        {field.type === "select" && (
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Opções (uma por linha)</span>
            <textarea
              rows={4}
              className="input-field text-xs"
              value={(field.options || []).join("\n")}
              onChange={(e) =>
                onFormFieldsChange(
                  formFields.map((f) =>
                    f.id === field.id
                      ? {
                          ...f,
                          options: e.target.value.split("\n").filter(Boolean),
                        }
                      : f,
                  ),
                )
              }
            />
          </label>
        )}
      </div>
    );
  }

  const block = blocks.find((b) => b.id === selection.id);
  if (!block) return null;

  return (
    <div className="space-y-4 p-4">
      <h3 className="text-sm font-semibold">Bloco</h3>
      {block.type === "text" && (
        <>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Texto</span>
            <textarea
              rows={4}
              className="input-field"
              value={block.content}
              onChange={(e) =>
                onBlocksChange(
                  blocks.map((b) =>
                    b.id === block.id && b.type === "text"
                      ? { ...b, content: e.target.value }
                      : b,
                  ),
                )
              }
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Alinhamento</span>
            <select
              className="input-field"
              value={block.align || "left"}
              onChange={(e) =>
                onBlocksChange(
                  blocks.map((b) =>
                    b.id === block.id && b.type === "text"
                      ? { ...b, align: e.target.value as "left" | "center" }
                      : b,
                  ),
                )
              }
            >
              <option value="left">Esquerda</option>
              <option value="center">Centro</option>
            </select>
          </label>
        </>
      )}
      {block.type === "image" && (
        <label className="block text-sm">
          <span className="mb-1 block text-muted">URL da imagem</span>
          <input
            className="input-field text-xs"
            value={block.url}
            onChange={(e) =>
              onBlocksChange(
                blocks.map((b) =>
                  b.id === block.id && b.type === "image"
                    ? { ...b, url: e.target.value }
                    : b,
                ),
              )
            }
          />
        </label>
      )}
      {block.type === "testimonial" && (
        <>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Depoimento</span>
            <textarea
              rows={3}
              className="input-field"
              value={block.quote}
              onChange={(e) =>
                onBlocksChange(
                  blocks.map((b) =>
                    b.id === block.id && b.type === "testimonial"
                      ? { ...b, quote: e.target.value }
                      : b,
                  ),
                )
              }
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Autor</span>
            <input
              className="input-field"
              value={block.author}
              onChange={(e) =>
                onBlocksChange(
                  blocks.map((b) =>
                    b.id === block.id && b.type === "testimonial"
                      ? { ...b, author: e.target.value }
                      : b,
                  ),
                )
              }
            />
          </label>
        </>
      )}
      <button
        type="button"
        className="btn-secondary w-full text-danger"
        onClick={() => onBlocksChange(blocks.filter((b) => b.id !== block.id))}
      >
        Remover bloco
      </button>
    </div>
  );
}
