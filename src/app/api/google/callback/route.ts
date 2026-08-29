import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exchangeGoogleCode } from "@/lib/google/calendar";

export async function GET(req: Request) {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.redirect(new URL("/login", base));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(
      new URL("/app/integrations?google=error", base),
    );
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8"),
    ) as { organizationId?: string };

    if (parsed.organizationId !== session.user.organizationId) {
      return NextResponse.redirect(
        new URL("/app/integrations?google=forbidden", base),
      );
    }

    const tokens = await exchangeGoogleCode(code);

    const existing = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
    });

    await prisma.organization.update({
      where: { id: session.user.organizationId },
      data: {
        googleAccessToken: tokens.accessToken,
        googleRefreshToken:
          tokens.refreshToken || existing?.googleRefreshToken || null,
        googleTokenExpiry: tokens.expiry,
        googleEmail: tokens.email,
        googleCalendarId: existing?.googleCalendarId || "primary",
      },
    });

    return NextResponse.redirect(
      new URL("/app/integrations?google=connected", base),
    );
  } catch (e) {
    console.error("[google:callback]", e);
    return NextResponse.redirect(
      new URL("/app/integrations?google=error", base),
    );
  }
}
