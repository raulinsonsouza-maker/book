"use client";

import { useEffect, useRef, useState } from "react";
import {
  ATESTADO_DEFAULT_TITLE,
  ATESTADO_HEADER_SRC,
  ATESTADO_SIGNATURE_SRC,
  atestadoIssueLine,
  isAtestadoKind,
  type AttendanceKind,
} from "@/lib/attendance/atestado";
import {
  attendanceBody,
  attendanceContactLine,
  attendanceIssueLine,
  type AttendanceDocumentData,
  type AttendanceHeader,
} from "@/lib/attendance/format";

type Props = {
  header: AttendanceHeader;
  data: AttendanceDocumentData & {
    kind?: AttendanceKind | string;
    title?: string | null;
    bodyText?: string | null;
  };
};

/** Folha A4 da declaração — mesmo texto e proporções do PDF. */
export function AttendanceDocument({ header, data }: Props) {
  if (isAtestadoKind(data.kind)) {
    return <AtestadoDocument data={data} />;
  }
  return <ComparecimentoDocument header={header} data={data} />;
}

function ComparecimentoDocument({
  header,
  data,
}: {
  header: AttendanceHeader;
  data: AttendanceDocumentData;
}) {
  const contact = attendanceContactLine(header);
  const signerTitle = (header.signerTitle || header.businessName).trim();
  const signerPhone = (header.signerPhone || header.phone).trim();

  return (
    <article className="attendance-sheet">
      <header className="attendance-head">
        {header.logoUrl.trim() && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={header.logoUrl} alt="" className="attendance-logo" />
        )}
        {header.businessName.trim() && (
          <p className="attendance-business">{header.businessName}</p>
        )}
        {header.address.trim() && <p className="attendance-meta">{header.address}</p>}
        {contact && <p className="attendance-meta">{contact}</p>}
        <hr className="attendance-rule" />
      </header>

      <h1 className="attendance-title">DECLARAÇÃO DE COMPARECIMENTO</h1>

      <div className="attendance-body">
        {attendanceBody(header, data).map((paragraph, i) => (
          <p key={i}>
            {paragraph.map((run, j) =>
              run.bold ? <strong key={j}>{run.text}</strong> : <span key={j}>{run.text}</span>,
            )}
          </p>
        ))}
      </div>

      <p className="attendance-issue">{attendanceIssueLine(data)}</p>

      <footer className="attendance-signature">
        <div className="attendance-sign-line" />
        {header.signerName.trim() && (
          <p className="attendance-sign-name">{header.signerName}</p>
        )}
        {signerTitle && <p className="attendance-sign-meta">{signerTitle}</p>}
        {signerPhone && <p className="attendance-sign-meta">{signerPhone}</p>}
      </footer>
    </article>
  );
}

function AtestadoDocument({
  data,
}: {
  data: AttendanceDocumentData & {
    title?: string | null;
    bodyText?: string | null;
  };
}) {
  const title = (data.title || ATESTADO_DEFAULT_TITLE).trim() || ATESTADO_DEFAULT_TITLE;
  const paragraphs = (data.bodyText || "")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <article className="attendance-sheet attendance-sheet--atestado">
      <header className="atestado-head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ATESTADO_HEADER_SRC}
          alt="Cabeçalho UPA"
          className="atestado-header-img"
        />
      </header>

      <h1 className="atestado-title">{title}</h1>
      <hr className="atestado-title-rule" />

      <div className="atestado-body">
        {paragraphs.length === 0 ? (
          <p className="text-muted">Preencha o texto do atestado…</p>
        ) : (
          paragraphs.map((p, i) => <p key={i}>{p}</p>)
        )}
      </div>

      <p className="atestado-issue">
        {atestadoIssueLine({
          issueCity: data.issueCity,
          issueDate: data.issueDate,
        })}
      </p>

      <footer className="atestado-signature">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ATESTADO_SIGNATURE_SRC}
          alt="Assinatura do profissional"
          className="atestado-signature-img"
        />
      </footer>
    </article>
  );
}

const SHEET_WIDTH_PX = (210 / 25.4) * 96;
const SHEET_HEIGHT_PX = (297 / 25.4) * 96;

/** Prévia da folha A4 reduzida para caber na largura disponível. */
export function AttendancePreview(props: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / SHEET_WIDTH_PX));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="attendance-preview" style={{ height: SHEET_HEIGHT_PX * scale }}>
      <div
        className="attendance-preview-inner"
        style={{ transform: `scale(${scale})`, width: SHEET_WIDTH_PX }}
      >
        <AttendanceDocument {...props} />
      </div>
    </div>
  );
}
