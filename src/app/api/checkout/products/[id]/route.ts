import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  parseProductFormConfig,
  serializeProductFormConfig,
} from "@/lib/product-form-config";

const schema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  priceCents: z.number().int().min(0).optional(),
  caktoOfferId: z.string().optional().nullable(),
  formConfig: z.any().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const product = await prisma.product.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: {
      checkoutLinks: { orderBy: { createdAt: "desc" } },
      _count: { select: { orders: true } },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  return NextResponse.json(product);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = schema.parse(await req.json());
    const existing = await prisma.product.findFirst({
      where: { id, organizationId: session.user.organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.priceCents !== undefined ? { priceCents: body.priceCents } : {}),
        ...(body.caktoOfferId !== undefined ? { caktoOfferId: body.caktoOfferId } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.formConfig !== undefined
          ? {
              formConfig: serializeProductFormConfig(
                parseProductFormConfig(JSON.stringify(body.formConfig)),
              ),
            }
          : {}),
      },
    });

    return NextResponse.json(product);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.product.findFirst({
    where: { id, organizationId: session.user.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
