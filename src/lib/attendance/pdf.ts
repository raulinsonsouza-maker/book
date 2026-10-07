import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import {
  attendanceBody,
  attendanceContactLine,
  attendanceIssueLine,
  type AttendanceDocumentData,
  type AttendanceHeader,
  type TextRun,
} from "./format";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 72;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

const INK = rgb(0.1, 0.1, 0.1);
const MUTED = rgb(0.36, 0.36, 0.36);
const ACCENT = rgb(0.61, 0.42, 0.18);

const BODY_SIZE = 12.5;
const BODY_LEADING = BODY_SIZE * 1.75;
const INDENT = BODY_SIZE * 3;

type Fonts = { regular: PDFFont; bold: PDFFont };

/** Troca caracteres fora do WinAnsi (fontes padrão do PDF) por equivalentes sem acento. */
function makeSanitizer(font: PDFFont) {
  const cache = new Map<string, string>();
  const ok = (ch: string) => {
    try {
      font.encodeText(ch);
      return true;
    } catch {
      return false;
    }
  };
  return (text: string) =>
    Array.from(text)
      .map((ch) => {
        const hit = cache.get(ch);
        if (hit !== undefined) return hit;
        let out = ch;
        if (!ok(ch)) {
          const stripped = ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          out = stripped && ok(stripped) ? stripped : "";
        }
        cache.set(ch, out);
        return out;
      })
      .join("");
}

async function loadLogoBytes(logoUrl: string): Promise<Uint8Array | null> {
  const url = logoUrl.trim();
  if (!url) return null;
  try {
    if (/^https?:\/\//i.test(url)) {
      const res = await fetch(url);
      if (!res.ok) return null;
      return new Uint8Array(await res.arrayBuffer());
    }
    if (!url.startsWith("/")) return null;
    const publicRoot = path.resolve(process.cwd(), "public");
    const resolved = path.resolve(publicRoot, `.${decodeURIComponent(url.split("?")[0]!)}`);
    if (!resolved.startsWith(publicRoot + path.sep)) return null;
    return new Uint8Array(await readFile(resolved));
  } catch {
    return null;
  }
}

async function embedLogo(doc: PDFDocument, logoUrl: string): Promise<PDFImage | null> {
  const bytes = await loadLogoBytes(logoUrl);
  if (!bytes) return null;
  try {
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
    return isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  } catch {
    return null;
  }
}

function drawCentered(page: PDFPage, text: string, y: number, font: PDFFont, size: number, color = INK) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (PAGE_W - w) / 2, y, size, font, color });
}

function drawSpacedCentered(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  spacing: number,
) {
  const chars = Array.from(text);
  const total =
    chars.reduce((sum, ch) => sum + font.widthOfTextAtSize(ch, size), 0) +
    spacing * (chars.length - 1);
  let x = (PAGE_W - total) / 2;
  for (const ch of chars) {
    page.drawText(ch, { x, y, size, font, color: INK });
    x += font.widthOfTextAtSize(ch, size) + spacing;
  }
}

type Word = { parts: { text: string; font: PDFFont }[]; width: number };

function toWords(runs: TextRun[], fonts: Fonts, clean: (t: string) => string): Word[] {
  const words: Word[] = [];
  let current: Word | null = null;
  for (const run of runs) {
    const font = run.bold ? fonts.bold : fonts.regular;
    for (const piece of clean(run.text).split(/(\s+)/)) {
      if (!piece) continue;
      if (/^\s+$/.test(piece)) {
        current = null;
        continue;
      }
      if (!current) {
        current = { parts: [], width: 0 };
        words.push(current);
      }
      current.parts.push({ text: piece, font });
      current.width += font.widthOfTextAtSize(piece, BODY_SIZE);
    }
  }
  return words;
}

/** Desenha um parágrafo justificado com recuo na primeira linha; devolve o y final. */
function drawParagraph(page: PDFPage, runs: TextRun[], startY: number, fonts: Fonts, clean: (t: string) => string) {
  const words = toWords(runs, fonts, clean);
  const space = fonts.regular.widthOfTextAtSize(" ", BODY_SIZE);
  const lines: Word[][] = [];
  let line: Word[] = [];
  let lineW = 0;
  for (const word of words) {
    const avail = CONTENT_W - (lines.length === 0 ? INDENT : 0);
    const next = line.length ? lineW + space + word.width : word.width;
    if (line.length && next > avail) {
      lines.push(line);
      line = [word];
      lineW = word.width;
    } else {
      line.push(word);
      lineW = next;
    }
  }
  if (line.length) lines.push(line);

  let y = startY;
  lines.forEach((ln, i) => {
    const offset = i === 0 ? INDENT : 0;
    const avail = CONTENT_W - offset;
    const wordsW = ln.reduce((s, w) => s + w.width, 0);
    const isLast = i === lines.length - 1;
    const gap = !isLast && ln.length > 1 ? (avail - wordsW) / (ln.length - 1) : space;
    let x = MARGIN_X + offset;
    for (const word of ln) {
      let wx = x;
      for (const part of word.parts) {
        page.drawText(part.text, { x: wx, y, size: BODY_SIZE, font: part.font, color: INK });
        wx += part.font.widthOfTextAtSize(part.text, BODY_SIZE);
      }
      x += word.width + gap;
    }
    y -= BODY_LEADING;
  });
  return y;
}

export async function buildAttendancePdf(
  header: AttendanceHeader,
  data: AttendanceDocumentData,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Declaração de comparecimento - ${data.patientName}`);
  doc.setAuthor(header.businessName || header.signerName);
  doc.setCreator("Book Symbius");

  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.TimesRoman),
    bold: await doc.embedFont(StandardFonts.TimesRomanBold),
  };
  const clean = makeSanitizer(fonts.regular);
  const page = doc.addPage([PAGE_W, PAGE_H]);

  let y = PAGE_H - 40;
  const logo = await embedLogo(doc, header.logoUrl);
  if (logo) {
    const h = 96;
    const w = (logo.width / logo.height) * h;
    page.drawImage(logo, { x: (PAGE_W - w) / 2, y: y - h, width: w, height: h });
    y -= h + 14;
  } else {
    y -= 20;
  }

  if (header.businessName.trim()) {
    drawCentered(page, clean(header.businessName.trim()), y, fonts.bold, 15);
    y -= 17;
  }
  if (header.address.trim()) {
    drawCentered(page, clean(header.address.trim()), y, fonts.regular, 10.5, MUTED);
    y -= 15;
  }
  const contact = attendanceContactLine(header);
  if (contact) {
    drawCentered(page, clean(contact), y, fonts.regular, 10.5, MUTED);
    y -= 15;
  }
  y -= 4;
  page.drawLine({
    start: { x: MARGIN_X, y },
    end: { x: PAGE_W - MARGIN_X, y },
    thickness: 0.8,
    color: ACCENT,
  });

  y -= 70;
  drawSpacedCentered(page, "DECLARAÇÃO DE COMPARECIMENTO", y, fonts.bold, 16, 1.6);

  y -= 62;
  for (const paragraph of attendanceBody(header, data)) {
    y = drawParagraph(page, paragraph, y, fonts, clean);
    y -= 12;
  }

  y -= 34;
  const issue = clean(attendanceIssueLine(data));
  const issueW = fonts.bold.widthOfTextAtSize(issue, BODY_SIZE);
  page.drawText(issue, { x: PAGE_W - MARGIN_X - issueW, y, size: BODY_SIZE, font: fonts.bold, color: INK });

  y = Math.min(y - 110, 230);
  const sigW = 250;
  page.drawLine({
    start: { x: (PAGE_W - sigW) / 2, y },
    end: { x: (PAGE_W + sigW) / 2, y },
    thickness: 0.7,
    color: INK,
  });
  y -= 18;
  if (header.signerName.trim()) {
    drawCentered(page, clean(header.signerName.trim()), y, fonts.bold, 12.5);
    y -= 16;
  }
  const signerTitle = (header.signerTitle || header.businessName).trim();
  if (signerTitle) {
    drawCentered(page, clean(signerTitle), y, fonts.regular, 11, MUTED);
    y -= 14;
  }
  const signerPhone = (header.signerPhone || header.phone).trim();
  if (signerPhone) {
    drawCentered(page, clean(signerPhone), y, fonts.regular, 11, MUTED);
  }

  return doc.save();
}
