import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  defaultProductFormConfig,
  parseProductFormConfig,
  serializeProductFormConfig,
} from "@/lib/product-form-config";
import { ensureProductCheckoutLink } from "@/lib/checkout-slug";
import { apiRequireAdmin } from "@/lib/rbac";
import { serializeNotifyEmails } from "@/lib/intake/notify-emails";

const schema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  priceCents: z.number().int().min(0),
  caktoOfferId: z.string().optional(),
  formConfig: z.any().optional(),
  isActive: z.boolean().optional(),
  productKind: z.enum(["SIMPLE", "INTAKE"]).optional(),
  intakeTemplateKey: z.string().optional().nullable(),
  notifyEmails: z.array(z.string().email()).optional(),
  intakeEmailAlerts: z.boolean().optional(),
});

export async function GET() {
  const auth = await apiRequireAdmin();
  if ("error" in auth) return auth.error;

  const products = await prisma.product.findMany({
    where: { organizationId: auth.ctx.organizationId },
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
  const auth = await apiRequireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = schema.parse(await req.json());
    const formConfig = body.formConfig
      ? serializeProductFormConfig(
          parseProductFormConfig(JSON.stringify(body.formConfig)),
        )
      : serializeProductFormConfig(defaultProductFormConfig());

    const product = await prisma.product.create({
      data: {
        organizationId: auth.ctx.organizationId,
        title: body.title,
        description: body.description,
        priceCents: body.priceCents,
        caktoOfferId: body.caktoOfferId || null,
        formConfig,
        isActive: body.isActive ?? true,
        productKind: body.productKind || "SIMPLE",
        intakeTemplateKey:
          body.productKind === "INTAKE"
            ? body.intakeTemplateKey || "company_opening_br"
            : null,
        notifyEmails: body.notifyEmails
          ? serializeNotifyEmails(body.notifyEmails)
          : null,
        intakeEmailAlerts: body.intakeEmailAlerts ?? true,
      },
    });

    const link = await ensureProductCheckoutLink(product.id, product.title);

    return NextResponse.json({ ...product, checkoutLinks: [{ slug: link.slug }] });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro ao criar produto" }, { status: 500 });
  }
}
