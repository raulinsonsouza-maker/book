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
      _count: { select: { checkoutLinks: true, orders: true } },
    },
    orderBy: { createdAt: "desc" },
  });

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

    return NextResponse.json(product);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
