"use client";

import type { ReactNode } from "react";
import { readEntityImageFile } from "@/lib/image-upload";

export type EntityImageShape = "square" | "round";

type BaseProps = {
  value: string | null;
  shape?: EntityImageShape;
  fallbackLabel?: string;
  onChange: (url: string | null) => void;
  onError: (msg: string) => void;
  maxBytes?: number;
};

function shapeClass(shape: EntityImageShape) {
  return shape === "round" ? "entity-image--round" : "entity-image--square";
}

function pickFile(
  file: File | null,
  onChange: (url: string | null) => void,
  onError: (msg: string) => void,
  maxBytes?: number,
) {
  readEntityImageFile(
    file,
    (url) => onChange(url),
    onError,
    maxBytes,
  );
}

/** Upload de imagem em formulários (criar/editar). */
export function EntityImagePicker({
  value,
  shape = "square",
  fallbackLabel = "Foto",
  onChange,
  onError,
  maxBytes,
  hint = "Aparece no link público · PNG, JPG ou WebP",
}: BaseProps & { hint?: string }) {
  const hasImage = Boolean(value);

  return (
    <div className="entity-image-picker-wrap">
      <label
        className={`entity-image-picker ${shapeClass(shape)}`}
        aria-label={hasImage ? "Trocar imagem" : "Adicionar imagem"}
      >
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => {
            pickFile(e.target.files?.[0] ?? null, onChange, onError, maxBytes);
            e.target.value = "";
          }}
        />
        <div className="entity-image-preview">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" />
          ) : (
            <span className="entity-image-fallback">{fallbackLabel}</span>
          )}
          <span className="entity-image-overlay">
            {hasImage ? "Trocar" : "Enviar"}
          </span>
        </div>
        <div className="entity-image-picker-copy">
          <span className="entity-image-picker-title">
            {hasImage ? "Trocar imagem" : "Adicionar imagem"}
          </span>
          <span className="entity-image-picker-hint">{hint}</span>
        </div>
      </label>
      {hasImage && (
        <button
          type="button"
          className="entity-image-remove"
          onClick={() => onChange(null)}
        >
          Remover imagem
        </button>
      )}
    </div>
  );
}

/** Miniatura clicável na lista (serviços, profissionais). */
export function EntityListImage({
  value,
  shape = "square",
  fallbackLabel = "?",
  uploadLabel,
  onChange,
  onError,
  maxBytes,
}: BaseProps & { uploadLabel?: string }) {
  const label = uploadLabel ?? (value ? "Trocar" : "Foto");

  return (
    <label
      className={`entity-list-image ${shapeClass(shape)}`}
      aria-label={value ? "Trocar imagem" : "Adicionar imagem"}
    >
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(e) => {
          pickFile(e.target.files?.[0] ?? null, onChange, onError, maxBytes);
          e.target.value = "";
        }}
      />
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" />
      ) : (
        <span className="entity-image-fallback">{fallbackLabel}</span>
      )}
      <span className="entity-image-overlay">{label}</span>
    </label>
  );
}

type EntityListCardProps = {
  image: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  inactive?: boolean;
};

/** Card padronizado para listagens admin (serviços, profissionais). */
export function EntityListCard({
  image,
  title,
  meta,
  description,
  actions,
  footer,
  inactive,
}: EntityListCardProps) {
  return (
    <li
      className={`entity-list-card surface space-y-3 p-5 ${inactive ? "entity-list-card-inactive" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {image}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">{title}</div>
            {meta && <div className="mt-0.5 text-sm text-muted">{meta}</div>}
            {description && (
              <div className="mt-1 line-clamp-2 text-sm text-muted">
                {description}
              </div>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap gap-2">{actions}</div>
        )}
      </div>
      {footer}
    </li>
  );
}

export function EntityStatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${
        active ? "bg-emerald-500" : "bg-zinc-300"
      }`}
      aria-hidden
    />
  );
}

export function AdminPageIntro({
  children,
  link,
}: {
  children: ReactNode;
  link?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <p className="text-sm text-muted">{children}</p>
      {link && (
        <a
          href={link.href}
          className="shrink-0 text-sm font-medium text-muted underline-offset-2 hover:text-foreground hover:underline"
        >
          {link.label}
        </a>
      )}
    </div>
  );
}

export function AdminFlashMessage({
  tone,
  children,
}: {
  tone: "ok" | "err";
  children: ReactNode;
}) {
  return (
    <p
      className={`rounded-lg border px-4 py-2 text-sm ${
        tone === "err"
          ? "border-red-200 bg-red-50 text-danger"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      {children}
    </p>
  );
}
