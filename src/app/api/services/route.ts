import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = schema.parse(await req.json());
    const page = await prisma.bookingPage.findFirst({
      where: {
        id: body.bookingPageId,
        organizationId: session.user.organizationId,
      },
    });
    if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
