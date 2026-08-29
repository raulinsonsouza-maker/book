import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiRequireAdmin } from "@/lib/rbac";

const fieldSchema = z.object({
  label: z.string().min(1),
  type: z.enum(["TEXT", "NUMBER", "SELECT", "TEXTAREA", "PHONE", "CPF"]),
  required: z.boolean().optional(),
  options: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
});

const schema = z.object({
  bookingPageId: z.string(),
  title: z.string().min(2),
  description: z.string().optional(),
  durationMinutes: z.number().int().min(5).max(480),
  priceCents: z.number().int().min(0),
  caktoOfferId: z.string().nullable().optional(),
  bufferBefore: z.number().int().min(0).optional(),
  bufferAfter: z.number().int().min(0).optional(),
  customFields: z.array(fieldSchema).optional(),
});

export async function POST(req: Request) {
  const auth = await apiRequireAdmin();
  if ("error" in auth) return auth.error;
  try {
    const body = schema.parse(await req.json());
    const page = await prisma.bookingPage.findFirst({
      where: {
        id: body.bookingPageId,
        organizationId: auth.ctx.organizationId,
      },
    });
    if (!page) {
      return NextResponse.json({ error: "Agenda não encontrada" }, { status: 404 });
    }

    const count = await prisma.service.count({
      where: { bookingPageId: body.bookingPageId },
    });

    const service = await prisma.service.create({
      data: {
        bookingPageId: body.bookingPageId,
        title: body.title,
        description: body.description,
        durationMinutes: body.durationMinutes,
        priceCents: body.priceCents,
        caktoOfferId: body.caktoOfferId,
        bufferBefore: body.bufferBefore ?? 0,
        bufferAfter: body.bufferAfter ?? 0,
        sortOrder: count,
        customFields: body.customFields
          ? {
              create: body.customFields.map((f, i) => ({
                label: f.label,
                type: f.type,
                required: f.required ?? false,
                options: f.options,
                sortOrder: f.sortOrder ?? i,
              })),
            }
          : undefined,
      },
      include: { customFields: true },
    });
    return NextResponse.json(service);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
