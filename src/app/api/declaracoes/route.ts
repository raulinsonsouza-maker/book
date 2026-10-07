import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiRequireAttendance } from "@/lib/attendance/server";
import {
  isValidIsoDate,
  isValidTime,
  issueDateToDate,
  todayIsoDate,
} from "@/lib/attendance/format";
import { serializeCertificate } from "@/lib/attendance/serialize";

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

const createSchema = z
  .object({
    patientName: z.string().trim().min(3, "Informe o nome completo").max(160),
    visitDate: z.string().refine(isValidIsoDate, "Data do atendimento inválida"),
    startTime: z.string().refine(isValidTime, "Horário de entrada inválido"),
    endTime: z.string().refine(isValidTime, "Horário de saída inválido"),
    issueDate: z.string().refine(isValidIsoDate, "Data de emissão inválida").optional(),
  })
  .refine((d) => d.endTime > d.startTime, {
    message: "O horário de saída precisa ser depois da entrada",
    path: ["endTime"],
  });

export async function POST(req: Request) {
  const access = await apiRequireAttendance();
  if ("error" in access) return access.error;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Dados inválidos" },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const { header, ctx } = access;

  const created = await prisma.attendanceCertificate.create({
    data: {
      organizationId: ctx.organizationId,
      patientName: data.patientName.replace(/\s+/g, " "),
      visitDate: data.visitDate,
      startTime: data.startTime,
      endTime: data.endTime,
      issuedAt: issueDateToDate(data.issueDate || todayIsoDate()),
      issueCity: header.city,
      headerSnapshot: JSON.stringify(header),
      createdByUserId: ctx.userId,
    },
  });

  return NextResponse.json({ item: serializeCertificate(created) }, { status: 201 });
}
