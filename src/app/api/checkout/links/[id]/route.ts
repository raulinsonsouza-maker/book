import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  title: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  accentColor: z.string().optional().nullable(),
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
  const link = await prisma.checkoutLink.findFirst({
    where: {
      id,
      product: { organizationId: session.user.organizationId },
    },
    include: {
      product: true,
      _count: { select: { orders: true } },
    },
  });

  if (!link) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  return NextResponse.json(link);
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
    const existing = await prisma.checkoutLink.findFirst({
      where: {
        id,
        product: { organizationId: session.user.organizationId },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }

    const link = await prisma.checkoutLink.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.logoUrl !== undefined ? { logoUrl: body.logoUrl } : {}),
        ...(body.accentColor !== undefined ? { accentColor: body.accentColor } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
      include: { product: true },
    });

    return NextResponse.json(link);
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
  const existing = await prisma.checkoutLink.findFirst({
    where: {
      id,
      product: { organizationId: session.user.organizationId },
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  await prisma.checkoutLink.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
