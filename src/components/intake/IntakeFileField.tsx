"use client";

import { useRef, useState } from "react";

type AttachmentInfo = {
  id: string;
  fieldKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  partnerIndex?: number | null;
};

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function IntakeFileField({
  fieldKey,
  label,
  hint,
  required,
  checkoutSlug,
  orderId,
  attachment,
  onUploaded,
  onRemoved,
}: {
  fieldKey: string;
  label: string;
  hint: string;
  required?: boolean;
  checkoutSlug: string;
  orderId: string | null;
  attachment?: AttachmentInfo | null;
  onUploaded: (info: AttachmentInfo) => void;
  onRemoved: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    if (!orderId) {
      setError("Salve os dados antes de enviar documentos");
      return;
    }
    setUploading(true);
    setError("");
    const form = new FormData();
    form.set("orderId", orderId);
    form.set("fieldKey", fieldKey);
    form.set("file", file);

    const res = await fetch(
      `/api/public/checkout/${checkoutSlug}/intake/upload`,
      { method: "POST", body: form },
    );
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      setError(data.error || "Erro no upload");
      return;
    }
    onUploaded(data);
  }

  async function remove() {
    if (!orderId || !attachment) return;
    setUploading(true);
    setError("");
    const res = await fetch(
      `/api/public/checkout/${checkoutSlug}/intake/upload?orderId=${encodeURIComponent(orderId)}&fieldKey=${encodeURIComponent(fieldKey)}`,
      { method: "DELETE" },
    );
    setUploading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erro ao remover");
      return;
    }
    onRemoved();
  }

  const isPdf = attachment?.mimeType === "application/pdf";

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">
            {label}
            {required ? <span className="text-danger"> *</span> : null}
          </p>
          <p className="mt-0.5 text-xs text-muted">{hint}</p>
        </div>
        {attachment ? (
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              Trocar
            </button>
            <button
              type="button"
              className="btn-ghost text-xs text-danger"
              disabled={uploading}
              onClick={() => void remove()}
            >
              Remover
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={uploading || !orderId}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? "Enviando…" : "Enviar documento"}
          </button>
        )}
      </div>

      {attachment && (
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-muted/10 px-3 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background text-xs font-semibold uppercase">
            {isPdf ? "PDF" : "IMG"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{attachment.fileName}</p>
            <p className="text-xs text-muted">{formatBytes(attachment.sizeBytes)}</p>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
