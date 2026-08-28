import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  bookingPageId: z.string(),
  exceptions: z.array(
    z.object({
      date: z.string(),
      isBlocked: z.boolean(),
      startTime: z.string().nullable().optional(),
      endTime: z.string().nullable().optional(),
    }),
  ),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookingPageId = new URL(req.url).searchParams.get("bookingPageId");
  if (!bookingPageId) {
    return NextResponse.json({ error: "bookingPageId required" }, { status: 400 });
  }

  const page = await prisma.bookingPage.findFirst({
    where: { id: bookingPageId, organizationId: session.user.organizationId },
  });
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const exceptions = await prisma.availabilityException.findMany({
    where: { bookingPageId },
    orderBy: { date: "asc" },
  });
  return NextResponse.json(exceptions);
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = schema.parse(await req.json());
    const page = await prisma.bookingPage.findFirst({
      where: {
        id: body.bookingPageId,
        organizationId: session.user.organizationId,
      },
    });
    if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.$transaction([
      prisma.availabilityException.deleteMany({
        where: { bookingPageId: body.bookingPageId },
      }),
      prisma.availabilityException.createMany({
        data: body.exceptions.map((e) => ({
          bookingPageId: body.bookingPageId,
          date: e.date,
          isBlocked: e.isBlocked,
          startTime: e.startTime ?? null,
          endTime: e.endTime ?? null,
        })),
      }),
    ]);

    const exceptions = await prisma.availabilityException.findMany({
      where: { bookingPageId: body.bookingPageId },
      orderBy: { date: "asc" },
    });
    return NextResponse.json(exceptions);
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}
