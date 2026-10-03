"use client";

import { useState } from "react";

export function CopyLinkButton({
  url,
  className,
  copiedLabel = "Copiado!",
  label = "Copiar link",
  iconOnly = false,
}: {
  url: string;
  className?: string;
  copiedLabel?: string;
  label?: string;
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={copied ? copiedLabel : label}
      aria-label={copied ? copiedLabel : label}
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={className ?? "btn-secondary"}
    >
      {iconOnly ? (
        copied ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" strokeLinecap="round" />
          </svg>
        )
      ) : copied ? (
        copiedLabel
      ) : (
        label
      )}
    </button>
  );
}
