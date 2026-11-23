import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiRequireAttendance } from "@/lib/attendance/server";
import {
  ATESTADO_DEFAULT_SIGNER_CRM,
  ATESTADO_DEFAULT_SIGNER_NAME,
  ATESTADO_DEFAULT_SIGNER_SPECIALTY,
  ATESTADO_DEFAULT_TITLE,
  ATESTADO_KIND,
  COMPARECIMENTO_KIND,
  isAtestadoKind,
} from "@/lib/attendance/atestado";
import {
  isValidIsoDate,
  isValidTime,
  issueDateToDate,
  todayIsoDate,
} from "@/lib/attendance/format";
import { serializeCertificate } from "@/lib/attendance/serialize";
import { orgCanIssueAtestado } from "@/lib/attendance/atestado-access";

export async function GET(req: Request) {
  const access = await apiRequireAttendance();
  if ("error" in access) return access.error;

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const items = await prisma.attendanceCertificate.findMany({
    where: {
      organizationId: access.ctx.organizationId,
      ...(q ? { patientName: { contains: q } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ items: items.map(serializeCertificate) });
}

const comparecimentoSchema = z
  .object({
    kind: z.literal(COMPARECIMENTO_KIND).optional(),
    patientName: z.string().trim().min(3, "Informe o nome completo").max(160),
    visitDate: z.string().refine(isValidIsoDate, "Data do atendimento inválida"),
    startTime: z.string().refine(isValidTime, "Horário de entrada inválido"),
    endTime: z.string().refine(isValidTime, "Horário de saída inválido"),
    issueDate: z
      .string()
      .refine(isValidIsoDate, "Data de emissão inválida")
      .optional(),
  })
  .refine((d) => d.endTime > d.startTime, {
    message: "O horário de saída precisa ser depois da entrada",
    path: ["endTime"],
  });

const atestadoSchema = z.object({
  kind: z.literal(ATESTADO_KIND),
  patientName: z.string().trim().min(3, "Informe o nome completo").max(160),
  issueDate: z
    .string()
    .refine(isValidIsoDate, "Data de emissão inválida")
    .optional(),
  issueCity: z.string().trim().max(120).optional(),
  title: z.string().trim().min(1).max(120).optional(),
  bodyText: z
    .string()
    .trim()
    .min(20, "Informe o texto do atestado")
    .max(8000),
  footerLeft: z.string().trim().max(240).optional(),
  footerRight: z.string().trim().max(120).optional(),
  signerName: z.string().trim().max(160).optional(),
  signerSpecialty: z.string().trim().max(120).optional(),
  signerCrm: z.string().trim().max(80).optional(),
  visitDate: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

export async function POST(req: Request) {
  const access = await apiRequireAttendance();
  if ("error" in access) return access.error;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const kindRaw =
    typeof (body as { kind?: unknown }).kind === "string"
      ? (body as { kind: string }).kind
      : COMPARECIMENTO_KIND;

  const { header, ctx } = access;

  if (isAtestadoKind(kindRaw)) {
    if (!(await orgCanIssueAtestado(ctx.organizationId))) {
      return NextResponse.json(
        { error: "Atestado médico não está disponível nesta conta" },
        { status: 403 },
      );
    }
    const parsed = atestadoSchema.safeParse({ ...body, kind: ATESTADO_KIND });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados inválidos" },
        { status: 400 },
      );
    }
    const data = parsed.data;
    const issueDate = data.issueDate || todayIsoDate();
    const visitDate =
      data.visitDate && isValidIsoDate(data.visitDate)
        ? data.visitDate
        : issueDate;
    const created = await prisma.attendanceCertificate.create({
      data: {
        organizationId: ctx.organizationId,
        kind: ATESTADO_KIND,
        patientName: data.patientName.replace(/\s+/g, " "),
        visitDate,
        startTime: data.startTime && isValidTime(data.startTime) ? data.startTime : "00:00",
        endTime: data.endTime && isValidTime(data.endTime) ? data.endTime : "00:01",
        issuedAt: issueDateToDate(issueDate),
        issueCity: (data.issueCity || header.city || "Piracicaba-SP").trim(),
        title: (data.title || ATESTADO_DEFAULT_TITLE).trim(),
        bodyText: data.bodyText,
        footerLeft: (data.footerLeft || "").trim() || null,
        footerRight: (data.footerRight || "").trim() || null,
        signerName:
          (data.signerName || ATESTADO_DEFAULT_SIGNER_NAME).trim() ||
          ATESTADO_DEFAULT_SIGNER_NAME,
        signerSpecialty:
          (data.signerSpecialty || ATESTADO_DEFAULT_SIGNER_SPECIALTY).trim() ||
          ATESTADO_DEFAULT_SIGNER_SPECIALTY,
        signerCrm:
          (data.signerCrm || ATESTADO_DEFAULT_SIGNER_CRM).trim() ||
          ATESTADO_DEFAULT_SIGNER_CRM,
        headerSnapshot: JSON.stringify({ kind: ATESTADO_KIND }),
        createdByUserId: ctx.userId,
      },
    });
    return NextResponse.json(
      { item: serializeCertificate(created) },
      { status: 201 },
    );
  }

  const parsed = comparecimentoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Dados inválidos" },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const created = await prisma.attendanceCertificate.create({
    data: {
      organizationId: ctx.organizationId,
      kind: COMPARECIMENTO_KIND,
      patientName: data.patientName.replace(/\s+/g, " "),
      visitDate: data.visitDate,
      startTime: data.startTime,
      endTime: data.endTime,
      issuedAt: issueDateToDate(data.issueDate || todayIsoDate()),
      issueCity: header.city,
      title: null,
      bodyText: null,
      headerSnapshot: JSON.stringify(header),
      createdByUserId: ctx.userId,
    },
  });

  return NextResponse.json({ item: serializeCertificate(created) }, { status: 201 });
}
