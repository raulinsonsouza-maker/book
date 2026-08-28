import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseProductFormConfig } from "@/lib/product-form-config";
import { resolvePaymentProvider, paymentProviderLabel } from "@/lib/payments/resolve-provider";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const link = await prisma.checkoutLink.findFirst({
    where: { slug, isActive: true },
    include: {
      product: {
        include: { organization: true },
      },
    },
  });

  if (!link || !link.product.isActive) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  const org = link.product.organization;
  const formConfig = parseProductFormConfig(link.product.formConfig);
  const provider = resolvePaymentProvider(org);

  return NextResponse.json({
    link: {
      id: link.id,
      slug: link.slug,
      title: link.title,
      logoUrl: link.logoUrl,
      accentColor: link.accentColor,
    },
    product: {
      id: link.product.id,
      title: link.product.title,
      description: link.product.description,
      priceCents: link.product.priceCents,
    },
    displayTitle: link.title || link.product.title,
    displayLogoUrl: link.logoUrl,
    displayAccentColor: link.accentColor || "#0a0a0a",
    formConfig,
    paymentProvider: provider,
    paymentProviderLabel: paymentProviderLabel(provider),
    demoPayments: provider === "DEMO",
    mercadoPagoPublicKey: org.mercadoPagoPublicKey,
    caktoSdkClientId: org.caktoSdkClientId,
  });
}
