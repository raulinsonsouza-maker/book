import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

const schema = z.object({
  title: z.string().min(2),
  slug: z.string().min(2).optional(),
  description: z.string().optional(),
  accentColor: z.string().optional(),
  websiteUrl: z.string().optional(),
  instagram: z.string().optional(),
  timezone: z.string().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const pages = await prisma.bookingPage.findMany({
    where: { organizationId: session.user.organizationId },
    include: {
      _count: { select: { services: true, bookings: true } },
      services: { where: { isActive: true }, take: 3 },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(pages);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = schema.parse(await req.json());
    let slug = slugify(body.slug || body.title);
    const taken = await prisma.bookingPage.findUnique({ where: { slug } });
    if (taken) slug = `${slug}-${Date.now().toString(36)}`;

    const page = await prisma.bookingPage.create({
      data: {
        organizationId: session.user.organizationId,
        title: body.title,
        slug,
        description: body.description,
        accentColor: body.accentColor || "#0a0a0a",
        websiteUrl: body.websiteUrl,
        instagram: body.instagram,
        timezone: body.timezone || "America/Sao_Paulo",
        availability: {
          create: [
            { dayOfWeek: 1, startTime: "09:00", endTime: "18:00" },
            { dayOfWeek: 2, startTime: "09:00", endTime: "18:00" },
            { dayOfWeek: 3, startTime: "09:00", endTime: "18:00" },
            { dayOfWeek: 4, startTime: "09:00", endTime: "18:00" },
            { dayOfWeek: 5, startTime: "09:00", endTime: "18:00" },
          ],
        },
      },
    });
    return NextResponse.json(page);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
