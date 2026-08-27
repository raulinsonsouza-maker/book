import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAvailableDays, getAvailableSlots } from "@/lib/availability";

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
          caktoSdkClientId: true,
          caktoClientId: true,
          caktoClientSecret: true,
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
    return NextResponse.json({
      page: {
        id: page.id,
        title: page.title,
        slug: page.slug,
        description: page.description,
        logoUrl: page.logoUrl,
        accentColor: page.accentColor,
        websiteUrl: page.websiteUrl,
        instagram: page.instagram,
        timezone: page.timezone,
      },
      services: page.services,
      availableDays: days,
      caktoSdkClientId: page.organization.caktoSdkClientId || null,
      demoPayments: !(
        page.organization.caktoClientId && page.organization.caktoClientSecret
      ),
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
