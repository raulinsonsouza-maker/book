"use client";

import { useState } from "react";

export function CopyLinkButton({
  url,
  className,
  copiedLabel = "Copiado!",
  label = "Copiar link",
}: {
  url: string;
  className?: string;
  copiedLabel?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={className ?? "btn-secondary"}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
