import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { uniqueBookingPageSlug } from "@/lib/booking-page-slug";
import { DEFAULT_TIMEZONE } from "@/lib/utils";
import { apiRequireAdmin } from "@/lib/rbac";

const schema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  accentColor: z.string().optional(),
  websiteUrl: z.string().optional(),
  instagram: z.string().optional(),
});

export async function GET() {
  const auth = await apiRequireAdmin();
  if ("error" in auth) return auth.error;

  const pages = await prisma.bookingPage.findMany({
    where: { organizationId: auth.ctx.organizationId },
    include: {
      _count: { select: { services: true, bookings: true } },
      services: { where: { isActive: true }, take: 3 },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(pages);
}

export async function POST(req: Request) {
  const auth = await apiRequireAdmin();
  if ("error" in auth) return auth.error;
  try {
    const body = schema.parse(await req.json());
    const org = await prisma.organization.findUnique({
      where: { id: auth.ctx.organizationId },
      select: { timezone: true },
    });
    const slug = await uniqueBookingPageSlug(
      auth.ctx.organizationId,
      body.title,
    );

    const page = await prisma.bookingPage.create({
      data: {
        organizationId: auth.ctx.organizationId,
        title: body.title,
        slug,
        description: body.description,
        accentColor: body.accentColor || "#0a0a0a",
        websiteUrl: body.websiteUrl,
        instagram: body.instagram,
        timezone: org?.timezone || DEFAULT_TIMEZONE,
      },
    });
    return NextResponse.json(page);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro ao criar agenda" }, { status: 500 });
  }
}
