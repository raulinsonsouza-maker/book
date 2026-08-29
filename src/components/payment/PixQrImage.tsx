"use client";

import { useEffect, useState } from "react";

type Props = {
  payload: string;
  base64?: string | null;
};

function toDataUrl(base64: string) {
  if (base64.startsWith("data:")) return base64;
  return `data:image/png;base64,${base64}`;
}

/** Exibe QR Pix (base64 do provedor ou gerado localmente a partir do código copia-e-cola). */
export function PixQrImage({ payload, base64 }: Props) {
  const [src, setSrc] = useState<string | null>(
    base64 ? toDataUrl(base64) : null,
  );

  useEffect(() => {
    if (base64) {
      setSrc(toDataUrl(base64));
      return;
    }
    if (!payload) {
      setSrc(null);
      return;
    }
    let cancelled = false;
    void import("qrcode").then((QRCode) =>
      QRCode.toDataURL(payload, {
        width: 240,
        margin: 2,
        errorCorrectionLevel: "M",
      }).then((url) => {
        if (!cancelled) setSrc(url);
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [payload, base64]);

  if (!src) {
    return (
      <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-xl bg-muted-bg text-xs text-muted">
        Gerando QR…
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="QR Code Pix"
      width={192}
      height={192}
      className="mx-auto h-48 w-48 rounded-xl border border-border bg-white p-2 shadow-sm"
    />
  );
}
