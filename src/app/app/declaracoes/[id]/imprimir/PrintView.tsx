"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AttendanceDocument } from "@/components/documents/AttendanceDocument";
import type { AttendanceCertificateDTO } from "@/lib/attendance/serialize";

export function PrintView({ certificate }: { certificate: AttendanceCertificateDTO }) {
  useEffect(() => {
    let cancelled = false;
    const images = Array.from(
      document.querySelectorAll<HTMLImageElement>(".attendance-print-stage img"),
    );
    // Espera o logo carregar para ele não sair em branco na impressão.
    Promise.all(
      images.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            }),
      ),
    ).then(() => {
      if (!cancelled) window.setTimeout(() => window.print(), 150);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <style>{"@page { size: A4; margin: 0; }"}</style>
      <div className="no-print mb-2 flex flex-wrap items-center justify-between gap-3">
        <Link href="/app/declaracoes" className="text-sm text-muted hover:text-foreground">
          ← Voltar para declarações
        </Link>
        <div className="flex gap-2">
          <a className="btn-secondary" href={`/api/declaracoes/${certificate.id}/pdf`}>
            Baixar PDF
          </a>
          <button type="button" className="btn-primary" onClick={() => window.print()}>
            Imprimir
          </button>
        </div>
      </div>
      <div className="attendance-print-stage">
        <AttendanceDocument header={certificate.header} data={certificate} />
      </div>
    </div>
  );
}
