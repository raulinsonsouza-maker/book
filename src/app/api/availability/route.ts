import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeRules } from "@/lib/availability-core";

const schema = z.object({
  bookingPageId: z.string(),
  rules: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string(),
      endTime: z.string(),
    }),
  ),
});

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
      prisma.availabilityRule.deleteMany({
        where: { bookingPageId: body.bookingPageId },
      }),
      prisma.availabilityRule.createMany({
        data: normalizeRules(body.rules).map((r) => ({
          bookingPageId: body.bookingPageId,
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime,
          endTime: r.endTime,
        })),
      }),
    ]);

    const rules = await prisma.availabilityRule.findMany({
      where: { bookingPageId: body.bookingPageId },
      orderBy: { dayOfWeek: "asc" },
    });
    return NextResponse.json(rules);
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}
