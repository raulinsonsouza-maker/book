"use client";

import { AttendanceDocument } from "@/components/documents/AttendanceDocument";
import type { AttendanceCertificateDTO } from "@/lib/attendance/serialize";

type Props = {
  token: string;
  kindLabel: string;
  clinicName: string;
  logoUrl: string | null;
  document: AttendanceCertificateDTO;
};

export function PublicDocumentView({
  token,
  kindLabel,
  clinicName,
  logoUrl,
  document,
}: Props) {
  const pdfHref = `/api/public/documents/${token}/pdf`;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone-100 via-stone-50 to-stone-200 text-stone-900">
      <header className="border-b border-stone-200/80 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 text-sm font-semibold text-white">
              {clinicName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">
              {clinicName}
            </p>
            <p className="truncate text-xs text-stone-500">{kindLabel}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        <div className="mb-5 flex flex-wrap gap-2">
          <a
            href={pdfHref}
            className="inline-flex items-center justify-center rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800"
          >
            Baixar PDF
          </a>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-50"
            onClick={() => window.print()}
          >
            Imprimir
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm print:border-0 print:shadow-none">
          <AttendanceDocument header={document.header} data={document} />
        </div>
      </main>
    </div>
  );
}
