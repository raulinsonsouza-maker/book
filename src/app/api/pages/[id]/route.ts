import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uniqueBookingPageSlug } from "@/lib/booking-page-slug";
import { slugify } from "@/lib/utils";
import { getAuthContext, isProfessionalRole } from "@/lib/rbac";

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
  const ctx = await getAuthContext();
  const proId =
    ctx && isProfessionalRole(ctx.role) ? ctx.professionalId : null;

  const page = await prisma.bookingPage.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: {
      services: {
        where: {
          ...(proId
            ? {
                isActive: true,
                professionals: { some: { professionalId: proId } },
              }
            : {}),
        },
        include: { customFields: { orderBy: { sortOrder: "asc" } } },
        orderBy: { sortOrder: "asc" },
      },
      availability: {
        where: { professionalId: null },
        orderBy: { dayOfWeek: "asc" },
      },
      exceptions: {
        where: { professionalId: null },
        orderBy: { date: "asc" },
      },
      _count: { select: { bookings: true } },
    },
  });
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(page);
}

const updateSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  accentColor: z.string().optional(),
  websiteUrl: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  coverImageUrl: z.string().nullable().optional(),
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
    const data: Record<string, unknown> = { ...body };

    if (body.title !== undefined) {
      const nextSlug = slugify(body.title);
      if (nextSlug && nextSlug !== owned.slug) {
        data.slug = await uniqueBookingPageSlug(
          session.user.organizationId,
          body.title,
          id,
        );
      }
    }

    // Capa grande via JSON causa falha — use POST /cover (FormData)
    if (
      typeof data.coverImageUrl === "string" &&
      data.coverImageUrl.startsWith("data:")
    ) {
      delete data.coverImageUrl;
    }

    const page = await prisma.bookingPage.update({
      where: { id },
      data,
    });
    return NextResponse.json(page);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: e.flatten() },
        { status: 400 },
      );
    }
    console.error("[pages PATCH]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao salvar" },
      { status: 500 },
    );
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

  const bookingCount = await prisma.booking.count({
    where: { bookingPageId: id },
  });

  if (bookingCount > 0) {
    return NextResponse.json(
      {
        error:
          "Esta página tem agendamentos no histórico. Desative o link público em vez de excluir — assim nada se perde.",
        code: "HAS_BOOKING_HISTORY",
        bookingCount,
        canDeactivate: true,
      },
      { status: 409 },
    );
  }

  await prisma.bookingPage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
