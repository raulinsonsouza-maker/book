"use client";

import { useEffect, useRef, useState } from "react";
import {
  ATESTADO_DEFAULT_SIGNER_CRM,
  ATESTADO_DEFAULT_SIGNER_NAME,
  ATESTADO_DEFAULT_SIGNER_SPECIALTY,
  ATESTADO_DEFAULT_TITLE,
  ATESTADO_HEADER_SRC,
  ATESTADO_SIGN_LABEL,
  atestadoIssueLine,
  isAtestadoEspecialKind,
  kindDocumentTitle,
  type AttendanceKind,
} from "@/lib/attendance/atestado";
import { COMPARECIMENTO_KIND } from "@/lib/attendance/kinds";
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
    footerLeft?: string | null;
    footerRight?: string | null;
    signerName?: string | null;
    signerSpecialty?: string | null;
    signerCrm?: string | null;
  };
};

/** Folha A4 da declaração — mesmo texto e proporções do PDF. */
export function AttendanceDocument({ header, data }: Props) {
  if (isAtestadoEspecialKind(data.kind)) {
    return <AtestadoDocument data={data} />;
  }
  if (!data.kind || data.kind === COMPARECIMENTO_KIND) {
    return <ComparecimentoDocument header={header} data={data} />;
  }
  return <LetterheadDocument header={header} data={data} />;
}

function LetterheadDocument({
  header,
  data,
}: {
  header: AttendanceHeader;
  data: AttendanceDocumentData & {
    kind?: AttendanceKind | string;
    title?: string | null;
    bodyText?: string | null;
  };
}) {
  const contact = attendanceContactLine(header);
  const signerTitle = (header.signerTitle || header.businessName).trim();
  const signerPhone = (header.signerPhone || header.phone).trim();
  const heading =
    (data.title || "").trim() || kindDocumentTitle(data.kind);
  const paragraphs = (data.bodyText || "")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

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

      <h1 className="attendance-title">{heading.toUpperCase()}</h1>

      <div className="attendance-body">
        {paragraphs.length === 0 ? (
          <p className="text-muted">Preencha o texto do documento…</p>
        ) : (
          paragraphs.map((p, i) => <p key={i}>{p}</p>)
        )}
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
    footerLeft?: string | null;
    footerRight?: string | null;
    signerName?: string | null;
    signerSpecialty?: string | null;
    signerCrm?: string | null;
  };
}) {
  const title = (data.title || ATESTADO_DEFAULT_TITLE).trim() || ATESTADO_DEFAULT_TITLE;
  const paragraphs = (data.bodyText || "")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const footerLeft = (data.footerLeft || "").trim();
  const footerRight = (data.footerRight || "").trim();
  const signerName =
    (data.signerName || ATESTADO_DEFAULT_SIGNER_NAME).trim() ||
    ATESTADO_DEFAULT_SIGNER_NAME;
  const signerSpecialty =
    (data.signerSpecialty || ATESTADO_DEFAULT_SIGNER_SPECIALTY).trim() ||
    ATESTADO_DEFAULT_SIGNER_SPECIALTY;
  const signerCrm =
    (data.signerCrm || ATESTADO_DEFAULT_SIGNER_CRM).trim() ||
    ATESTADO_DEFAULT_SIGNER_CRM;

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

      <div className="atestado-signature">
        <div className="atestado-sign-space" aria-hidden="true" />
        <div className="atestado-sign-line" />
        <p className="atestado-sign-label">{ATESTADO_SIGN_LABEL}</p>
        <div className="atestado-sign-details">
          <p>
            <span className="atestado-sign-key">Nome:</span> {signerName}
          </p>
          <p>
            <span className="atestado-sign-key">Especialidade:</span>{" "}
            {signerSpecialty}
          </p>
          <p>
            <span className="atestado-sign-key">CRM:</span> {signerCrm}
          </p>
        </div>
      </div>

      {(footerLeft || footerRight) && (
        <footer className="atestado-page-footer">
          <span className="atestado-page-footer-left">{footerLeft}</span>
          <span className="atestado-page-footer-right">{footerRight}</span>
        </footer>
      )}
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
