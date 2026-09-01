import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseProductFormConfig } from "@/lib/product-form-config";
import { resolvePaymentProvider, paymentProviderLabel } from "@/lib/payments/resolve-provider";
import { resolveBrand } from "@/lib/branding";

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
  const brand = resolveBrand({
    org: {
      name: org.name,
      description: org.description,
      logoUrl: org.logoUrl,
      accentColor: org.accentColor,
    },
    title: link.title || link.product.title,
    description: link.product.description,
    logoUrl: link.logoUrl,
    accentColor: link.accentColor,
  });

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
      productKind: link.product.productKind,
      intakeTemplateKey: link.product.intakeTemplateKey,
    },
    businessName: brand.businessName,
    businessDescription: org.description,
    displayTitle: brand.title,
    displayDescription: brand.description,
    displayLogoUrl: brand.logoUrl,
    displayAccentColor: brand.accentColor,
    formConfig,
    paymentProvider: provider,
    paymentProviderLabel: paymentProviderLabel(provider),
    demoPayments: provider === "DEMO",
    mercadoPagoPublicKey: org.mercadoPagoPublicKey,
    caktoSdkClientId: org.caktoSdkClientId,
    cardMaxInstallments: Math.min(
      12,
      Math.max(1, org.cardMaxInstallments || 12),
    ),
  });
}
