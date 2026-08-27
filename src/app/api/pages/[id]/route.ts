import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

async function getOwnedPage(id: string, organizationId: string) {
  return prisma.bookingPage.findFirst({
    where: { id, organizationId },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const page = await prisma.bookingPage.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: {
      services: {
        include: { customFields: { orderBy: { sortOrder: "asc" } } },
        orderBy: { sortOrder: "asc" },
      },
      availability: { orderBy: { dayOfWeek: "asc" } },
      exceptions: { orderBy: { date: "asc" } },
    },
  });
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(page);
}

const updateSchema = z.object({
  title: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  accentColor: z.string().optional(),
  websiteUrl: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  timezone: z.string().optional(),
  logoUrl: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const owned = await getOwnedPage(id, session.user.organizationId);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = updateSchema.parse(await req.json());
    let slug = body.slug ? slugify(body.slug) : undefined;
    if (slug && slug !== owned.slug) {
      const taken = await prisma.bookingPage.findUnique({ where: { slug } });
      if (taken) slug = `${slug}-${Date.now().toString(36)}`;
    }
    const page = await prisma.bookingPage.update({
      where: { id },
      data: { ...body, slug },
    });
    return NextResponse.json(page);
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const owned = await getOwnedPage(id, session.user.organizationId);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.bookingPage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
