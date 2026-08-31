"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BlockInspector } from "@/components/builder/BlockInspector";
import { FunnelPreview } from "@/components/builder/FunnelPreview";
import type { FunnelBlock, FunnelConfig, FormFieldConfig } from "@/types/funnel-config";

type Selection =
  | { kind: "field"; id: string }
  | { kind: "block"; id: string }
  | { kind: "theme" }
  | null;

type Props = {
  pageId: string;
  orgSlug: string;
  pageSlug: string;
  embedded?: boolean;
};

function newId() {
  return `b_${Date.now().toString(36)}`;
}

export function PageBuilder({
  pageId,
  orgSlug,
  pageSlug,
  embedded = false,
}: Props) {
  const [config, setConfig] = useState<FunnelConfig | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [mobileTab, setMobileTab] = useState<"palette" | "preview" | "props">("preview");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    fetch(`/api/pages/${pageId}/funnel`)
      .then((r) => r.json())
      .then((data) => setConfig(data.config));
  }, [pageId]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!config) return;
    setSaving(true);
    const res = await fetch(`/api/pages/${pageId}/funnel`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config }),
    });
    setSaving(false);
    if (res.ok) {
      setMsg("Salvo");
      setTimeout(() => setMsg(""), 2000);
    } else setMsg("Erro ao salvar");
  }

  function moveField(index: number, dir: -1 | 1) {
    if (!config) return;
    const sorted = [...config.formFields].sort((a, b) => a.sortOrder - b.sortOrder);
    const j = index + dir;
    if (j < 0 || j >= sorted.length) return;
    const a = sorted[index];
    const b = sorted[j];
    const fields = config.formFields.map((f) => {
      if (f.id === a.id) return { ...f, sortOrder: b.sortOrder };
      if (f.id === b.id) return { ...f, sortOrder: a.sortOrder };
      return f;
    });
    setConfig({ ...config, formFields: fields });
  }

  function addCustomField() {
    if (!config) return;
    const id = newId();
    const maxOrder = Math.max(0, ...config.formFields.map((f) => f.sortOrder));
    const field: FormFieldConfig = {
      id,
      label: "Campo personalizado",
      type: "text",
      required: false,
      enabled: true,
      sortOrder: maxOrder + 1,
    };
    setConfig({ ...config, formFields: [...config.formFields, field] });
    setSelection({ kind: "field", id });
  }

  function addBlock(type: FunnelBlock["type"]) {
    if (!config) return;
    let block: FunnelBlock;
    const id = newId();
    if (type === "text") block = { id, type: "text", content: "Novo texto", align: "left" };
    else if (type === "image") block = { id, type: "image", url: "", alt: "" };
    else if (type === "divider") block = { id, type: "divider" };
    else block = { id, type: "testimonial", quote: "", author: "" };
    setConfig({ ...config, blocks: [...config.blocks, block] });
    setSelection({ kind: "block", id });
  }

  if (!config) {
    return <p className="p-8 text-sm text-muted">Carregando construtor…</p>;
  }

  const sortedFields = [...config.formFields].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div
      className={`flex flex-col ${
        embedded ? "min-h-[70vh]" : "h-[calc(100vh-3.5rem)]"
      }`}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          {!embedded && (
            <Link
              href={`/app/agendador?id=${pageId}`}
              className="text-sm text-muted hover:text-foreground"
            >
              ← Editor
            </Link>
          )}
          {msg && <span className="text-xs text-emerald-600">{msg}</span>}
        </div>
        <div className="flex gap-2">
          <a
            href={`/p/${orgSlug}/${pageSlug}`}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary !py-1.5 text-xs"
          >
            Abrir agenda
          </a>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="btn-primary !py-1.5 text-xs"
          >
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>

      <div className="flex shrink-0 gap-1 border-b border-border bg-white px-2 py-2 lg:hidden">
        {(
          [
            ["palette", "Elementos"],
            ["preview", "Preview"],
            ["props", "Propriedades"],
          ] as const
        ).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMobileTab(tab)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium ${
              mobileTab === tab ? "bg-muted-bg text-foreground" : "text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[240px_1fr_260px]">
        <aside
          className={`builder-panel overflow-y-auto border-r border-border lg:rounded-none ${
            mobileTab === "palette" ? "block" : "hidden lg:block"
          }`}
        >
          <div className="border-b border-border p-3">
            <button
              type="button"
              className="w-full rounded-lg border border-dashed border-border px-3 py-2 text-left text-xs font-medium hover:bg-muted-bg"
              onClick={() => setSelection({ kind: "theme" })}
            >
              🎨 Branding
            </button>
          </div>

          <div className="p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Campos do formulário
            </p>
            <ul className="space-y-1">
              {sortedFields.map((field, i) => (
                <li key={field.id}>
                  <button
                    type="button"
                    onClick={() => setSelection({ kind: "field", id: field.id })}
                    className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs ${
                      selection?.kind === "field" && selection.id === field.id
                        ? "bg-muted-bg font-medium"
                        : "hover:bg-muted-bg"
                    }`}
                  >
                    <span className={field.enabled ? "" : "text-muted line-through"}>
                      {field.label}
                    </span>
                    <span className="flex gap-0.5">
                      <button
                        type="button"
                        className="px-1 text-muted hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveField(i, -1);
                        }}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="px-1 text-muted hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveField(i, 1);
                        }}
                      >
                        ↓
                      </button>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={addCustomField}
              className="mt-2 w-full text-xs font-medium text-muted hover:text-foreground"
            >
              + Campo personalizado
            </button>
          </div>

          <div className="border-t border-border p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Blocos de conteúdo
            </p>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  ["text", "Texto"],
                  ["image", "Imagem"],
                  ["divider", "Linha"],
                  ["testimonial", "Depoimento"],
                ] as const
              ).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addBlock(type)}
                  className="rounded-md border border-border px-2 py-1 text-[10px] hover:bg-muted-bg"
                >
                  + {label}
                </button>
              ))}
            </div>
            <ul className="mt-2 space-y-1">
              {config.blocks.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => setSelection({ kind: "block", id: b.id })}
                    className="w-full rounded-lg px-2 py-1 text-left text-xs hover:bg-muted-bg"
                  >
                    {b.type}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div
          className={`min-h-0 overflow-auto bg-[#e8eaed] p-4 lg:p-6 ${
            mobileTab === "preview" ? "block" : "hidden lg:block"
          }`}
        >
          <FunnelPreview slug={pageSlug} config={config} />
        </div>

        <aside
          className={`builder-panel overflow-y-auto border-l border-border ${
            mobileTab === "props" ? "block" : "hidden lg:block"
          }`}
        >
          <BlockInspector
            selection={selection}
            formFields={config.formFields}
            blocks={config.blocks}
            theme={config.theme}
            onFormFieldsChange={(formFields) => setConfig({ ...config, formFields })}
            onBlocksChange={(blocks) => setConfig({ ...config, blocks })}
            onThemeChange={(theme) => setConfig({ ...config, theme })}
            onSelect={setSelection}
          />
        </aside>
      </div>
    </div>
  );
}
