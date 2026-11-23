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
  ATESTADO_PADRAO_KIND,
  COMPARECIMENTO_KIND,
  ENCAMINHAMENTO_KIND,
  RECEITA_KIND,
  parseAttendanceKind,
} from "@/lib/attendance/atestado";
import {
  isValidIsoDate,
  isValidTime,
  issueDateToDate,
  todayIsoDate,
} from "@/lib/attendance/format";
import { serializeCertificate } from "@/lib/attendance/serialize";
import { orgCanIssueAtestado } from "@/lib/attendance/atestado-access";
import {
  buildCreateBase,
  defaultTimesForTextDoc,
  especialSnapshot,
  letterheadSnapshot,
  resolveCustomerForOrg,
} from "@/lib/attendance/create-helpers";
import { resolveBusinessProfile } from "@/lib/business-profile";

export async function GET(req: Request) {
  const access = await apiRequireAttendance();
  if ("error" in access) return access.error;

  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const customerId = sp.get("customerId")?.trim() || null;

  const items = await prisma.attendanceCertificate.findMany({
    where: {
      organizationId: access.ctx.organizationId,
      ...(customerId ? { customerId } : {}),
      ...(q && !customerId ? { patientName: { contains: q } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ items: items.map(serializeCertificate) });
}

const customerIdField = z.string().cuid().optional().nullable();

const comparecimentoSchema = z
  .object({
    kind: z.literal(COMPARECIMENTO_KIND).optional(),
    patientName: z.string().trim().min(3, "Informe o nome completo").max(160),
    customerId: customerIdField,
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

const textDocSchema = z.object({
  kind: z.enum([ENCAMINHAMENTO_KIND, RECEITA_KIND, ATESTADO_PADRAO_KIND]),
  patientName: z.string().trim().min(3, "Informe o nome completo").max(160),
  customerId: customerIdField,
  issueDate: z
    .string()
    .refine(isValidIsoDate, "Data de emissão inválida")
    .optional(),
  issueCity: z.string().trim().max(120).optional(),
  title: z.string().trim().max(160).optional().nullable(),
  bodyText: z
    .string()
    .trim()
    .min(10, "Informe o texto do documento")
    .max(8000),
  visitDate: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

const atestadoSchema = z.object({
  kind: z.literal(ATESTADO_KIND),
  patientName: z.string().trim().min(3, "Informe o nome completo").max(160),
  customerId: customerIdField,
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
  const kind = parseAttendanceKind(kindRaw) ?? COMPARECIMENTO_KIND;
  const { header, ctx } = access;

  const customerIdRaw =
    typeof (body as { customerId?: unknown }).customerId === "string"
      ? (body as { customerId: string }).customerId
      : null;
  const customer = await resolveCustomerForOrg(
    ctx.organizationId,
    customerIdRaw,
  );
  if (customerIdRaw && !customer) {
    return NextResponse.json({ error: "Paciente não encontrado" }, { status: 400 });
  }

  if (kind === ATESTADO_KIND) {
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
    const times = defaultTimesForTextDoc();
    const created = await prisma.attendanceCertificate.create({
      data: buildCreateBase({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        kind: ATESTADO_KIND,
        patientName: customer?.name || data.patientName,
        customerId: customer?.id,
        visitDate,
        startTime:
          data.startTime && isValidTime(data.startTime)
            ? data.startTime
            : times.startTime,
        endTime:
          data.endTime && isValidTime(data.endTime)
            ? data.endTime
            : times.endTime,
        issuedAt: issueDateToDate(issueDate),
        issueCity: (data.issueCity || header.city || "Piracicaba-SP").trim(),
        headerSnapshot: especialSnapshot(),
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
      }),
    });
    return NextResponse.json(
      { item: serializeCertificate(created) },
      { status: 201 },
    );
  }

  if (
    kind === ENCAMINHAMENTO_KIND ||
    kind === RECEITA_KIND ||
    kind === ATESTADO_PADRAO_KIND
  ) {
    if (kind === RECEITA_KIND) {
      const org = await prisma.organization.findUnique({
        where: { id: ctx.organizationId },
        select: {
          businessProfile: true,
          featureFlags: true,
          attendanceEnabled: true,
        },
      });
      const profile = resolveBusinessProfile(
        org?.businessProfile,
        org?.featureFlags,
        org?.attendanceEnabled,
      );
      if (!profile.features.prescriptions) {
        return NextResponse.json(
          { error: "Receita não está disponível neste perfil" },
          { status: 403 },
        );
      }
    }

    const parsed = textDocSchema.safeParse({ ...body, kind });
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
    const times = defaultTimesForTextDoc();
    const created = await prisma.attendanceCertificate.create({
      data: buildCreateBase({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        kind: data.kind,
        patientName: customer?.name || data.patientName,
        customerId: customer?.id,
        visitDate,
        startTime:
          data.startTime && isValidTime(data.startTime)
            ? data.startTime
            : times.startTime,
        endTime:
          data.endTime && isValidTime(data.endTime)
            ? data.endTime
            : times.endTime,
        issuedAt: issueDateToDate(issueDate),
        issueCity: (data.issueCity || header.city || "").trim() || header.city,
        headerSnapshot: letterheadSnapshot(header),
        title: (data.title || "").trim() || null,
        bodyText: data.bodyText,
      }),
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
    data: buildCreateBase({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      kind: COMPARECIMENTO_KIND,
      patientName: customer?.name || data.patientName,
      customerId: customer?.id,
      visitDate: data.visitDate,
      startTime: data.startTime,
      endTime: data.endTime,
      issuedAt: issueDateToDate(data.issueDate || todayIsoDate()),
      issueCity: header.city,
      headerSnapshot: letterheadSnapshot(header),
    }),
  });

  return NextResponse.json({ item: serializeCertificate(created) }, { status: 201 });
}
