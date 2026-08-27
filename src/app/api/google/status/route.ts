import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { googleConfigured } from "@/lib/google/calendar";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
  });

  return NextResponse.json({
    configured: googleConfigured(),
    connected: Boolean(org?.googleRefreshToken || org?.googleAccessToken),
    email: org?.googleEmail || null,
    calendarId: org?.googleCalendarId || "primary",
  });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.organization.update({
    where: { id: session.user.organizationId },
    data: {
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiry: null,
      googleEmail: null,
      googleCalendarId: "primary",
    },
  });

  return NextResponse.json({ ok: true });
}
