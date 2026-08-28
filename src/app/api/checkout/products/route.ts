import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  defaultProductFormConfig,
  parseProductFormConfig,
  serializeProductFormConfig,
} from "@/lib/product-form-config";
import { ensureProductCheckoutLink } from "@/lib/checkout-slug";

const schema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  priceCents: z.number().int().min(0),
  caktoOfferId: z.string().optional(),
  formConfig: z.any().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    where: { organizationId: session.user.organizationId! },
    include: {
      checkoutLinks: {
        take: 1,
        orderBy: { createdAt: "asc" },
        select: { slug: true },
      },
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  for (const product of products) {
    if (product.checkoutLinks.length === 0) {
      const link = await ensureProductCheckoutLink(product.id, product.title);
      product.checkoutLinks = [{ slug: link.slug }];
    }
  }

  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = schema.parse(await req.json());
    const formConfig = body.formConfig
      ? serializeProductFormConfig(
          parseProductFormConfig(JSON.stringify(body.formConfig)),
        )
      : serializeProductFormConfig(defaultProductFormConfig());

    const product = await prisma.product.create({
      data: {
        organizationId: session.user.organizationId,
        title: body.title,
        description: body.description,
        priceCents: body.priceCents,
        caktoOfferId: body.caktoOfferId || null,
        formConfig,
        isActive: body.isActive ?? true,
      },
    });

    const link = await ensureProductCheckoutLink(product.id, product.title);

    return NextResponse.json({ ...product, checkoutLinks: [{ slug: link.slug }] });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
