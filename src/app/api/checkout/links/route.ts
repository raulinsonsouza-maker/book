import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uniqueCheckoutLinkSlug } from "@/lib/checkout-slug";

const schema = z.object({
  productId: z.string(),
  title: z.string().optional(),
  logoUrl: z.string().optional().nullable(),
  accentColor: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const links = await prisma.checkoutLink.findMany({
    where: {
      product: { organizationId: session.user.organizationId },
    },
    include: {
      product: { select: { id: true, title: true, priceCents: true, isActive: true } },
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(links);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = schema.parse(await req.json());
    const product = await prisma.product.findFirst({
      where: { id: body.productId, organizationId: session.user.organizationId },
    });
    if (!product) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }

    const slug = await uniqueCheckoutLinkSlug(body.title || product.title);
    const link = await prisma.checkoutLink.create({
      data: {
        productId: product.id,
        slug,
        title: body.title || null,
        logoUrl: body.logoUrl ?? null,
        accentColor: body.accentColor ?? null,
        isActive: body.isActive ?? true,
      },
      include: {
        product: { select: { id: true, title: true, priceCents: true } },
      },
    });

    return NextResponse.json(link);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
