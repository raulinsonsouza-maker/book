import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAvailableDays, getAvailableSlots } from "@/lib/availability";
import { mergeFunnelConfig, parseFunnelConfig } from "@/lib/funnel-config";
import { resolvePaymentProvider, paymentProviderLabel } from "@/lib/payments/resolve-provider";
import { resolveBrand } from "@/lib/branding";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");

  const page = await prisma.bookingPage.findFirst({
    where: { slug, isActive: true },
    include: {
      services: {
        where: { isActive: true },
        include: { customFields: { orderBy: { sortOrder: "asc" } } },
        orderBy: { sortOrder: "asc" },
      },
      organization: {
        select: {
          name: true,
          description: true,
          logoUrl: true,
          accentColor: true,
          caktoSdkClientId: true,
          caktoClientId: true,
          caktoClientSecret: true,
          caktoOfferId: true,
          paymentProvider: true,
          mercadoPagoAccessToken: true,
          mercadoPagoPublicKey: true,
          asaasApiKey: true,
        },
      },
    },
  });

  if (!page) {
    return NextResponse.json({ error: "Página não encontrada" }, { status: 404 });
  }

  if (!date) {
    const days = await getAvailableDays({
      bookingPageId: page.id,
      from: new Date(),
      timezone: page.timezone,
    });
    const provider = resolvePaymentProvider(page.organization);
    const brand = resolveBrand({
      org: page.organization,
      title: page.title,
      description: page.description,
      logoUrl: page.logoUrl,
      accentColor: page.accentColor,
    });
    const mergedFunnel = mergeFunnelConfig(parseFunnelConfig(page.funnelConfig), {
      title: brand.title,
      description: brand.description,
      accentColor: brand.accentColor,
      logoUrl: brand.logoUrl,
    });
    return NextResponse.json({
      page: {
        id: page.id,
        title: brand.title,
        slug: page.slug,
        description: brand.description,
        logoUrl: brand.logoUrl,
        accentColor: brand.accentColor,
        websiteUrl: page.websiteUrl,
        instagram: page.instagram,
        timezone: page.timezone,
      },
      brand: {
        businessName: brand.businessName,
        logoUrl: brand.logoUrl,
        accentColor: brand.accentColor,
        description: brand.description,
      },
      funnelConfig: {
        ...mergedFunnel,
        theme: {
          ...mergedFunnel.theme,
          logoUrl: mergedFunnel.theme.logoUrl || brand.logoUrl || undefined,
          accentColor: brand.accentColor,
          heroSubtitle:
            mergedFunnel.theme.heroSubtitle || brand.description || undefined,
        },
      },
      services: page.services,
      availableDays: days,
      paymentProvider: provider,
      paymentProviderLabel: paymentProviderLabel(provider),
      caktoSdkClientId: page.organization.caktoSdkClientId || null,
      mercadoPagoPublicKey: page.organization.mercadoPagoPublicKey || null,
      demoPayments: provider === "DEMO",
    });
  }

  if (!serviceId) {
    return NextResponse.json({ error: "serviceId obrigatório" }, { status: 400 });
  }

  const service = page.services.find((s) => s.id === serviceId);
  if (!service) {
    return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });
  }

  const slots = await getAvailableSlots({
    bookingPageId: page.id,
    serviceId: service.id,
    date,
    timezone: page.timezone,
    durationMinutes: service.durationMinutes,
    bufferBefore: service.bufferBefore,
    bufferAfter: service.bufferAfter,
  });

  return NextResponse.json({ slots, timezone: page.timezone });
}
