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

const atestadoUpdateSchema = z.object({
  kind: z.literal(ATESTADO_KIND).optional(),
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
});

const comparecimentoUpdateSchema = z
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await apiRequireAttendance();
  if ("error" in access) return access.error;

  const { id } = await params;
  const existing = await prisma.attendanceCertificate.findFirst({
    where: { id, organizationId: access.ctx.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Declaração não encontrada" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { header } = access;

  if (isAtestadoKind(existing.kind)) {
    if (!(await orgCanIssueAtestado(access.ctx.organizationId))) {
      return NextResponse.json(
        { error: "Atestado médico não está disponível nesta conta" },
        { status: 403 },
      );
    }
    const parsed = atestadoUpdateSchema.safeParse({
      ...body,
      kind: ATESTADO_KIND,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados inválidos" },
        { status: 400 },
      );
    }
    const data = parsed.data;
    const issueDate = data.issueDate || todayIsoDate();
    const updated = await prisma.attendanceCertificate.update({
      where: { id: existing.id },
      data: {
        patientName: data.patientName.replace(/\s+/g, " "),
        issuedAt: issueDateToDate(issueDate),
        issueCity: (data.issueCity || existing.issueCity || header.city || "Piracicaba-SP").trim(),
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
        visitDate: issueDate,
      },
    });
    return NextResponse.json({ item: serializeCertificate(updated) });
  }

  const parsed = comparecimentoUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Dados inválidos" },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const updated = await prisma.attendanceCertificate.update({
    where: { id: existing.id },
    data: {
      patientName: data.patientName.replace(/\s+/g, " "),
      visitDate: data.visitDate,
      startTime: data.startTime,
      endTime: data.endTime,
      issuedAt: issueDateToDate(data.issueDate || todayIsoDate()),
      issueCity: header.city || existing.issueCity,
    },
  });
  return NextResponse.json({ item: serializeCertificate(updated) });
}
