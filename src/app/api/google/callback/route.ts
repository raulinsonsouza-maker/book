import { NextResponse } from "next/server";
import { defaultAppOrigin } from "@/lib/app-origin";
import { getRequestAppOrigin } from "@/lib/app-origin-server";
import { prisma } from "@/lib/prisma";
import {
  exchangeGoogleCode,
  parseGoogleOAuthState,
} from "@/lib/google/calendar";

function safeReturnOrigin(raw: string | null | undefined) {
  const fallback = defaultAppOrigin();
  if (!raw) return fallback;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return fallback;
    return url.origin;
  } catch {
    return fallback;
  }
}

export async function GET(req: Request) {
  const requestOrigin = await getRequestAppOrigin();
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const parsed = state ? parseGoogleOAuthState(state) : null;
  const returnOrigin = safeReturnOrigin(parsed?.returnOrigin || requestOrigin);

  if (error || !code || !parsed) {
    return NextResponse.redirect(
      new URL("/app/configuracoes?tab=integracoes&google=error", returnOrigin),
    );
  }

  // OAuth state is HMAC-signed at /api/google/connect (already authenticated).
  // Ignore callback-host session cookies — Temark OAuth returns to the Book
  // callback URI, where a stale NextAuth cookie caused google=forbidden.

  try {
    const tokens = await exchangeGoogleCode(code);

    const existing = await prisma.organization.findUnique({
      where: { id: parsed.organizationId },
    });
    if (!existing) {
      return NextResponse.redirect(
        new URL("/app/configuracoes?tab=integracoes&google=error", returnOrigin),
      );
    }

    await prisma.organization.update({
      where: { id: parsed.organizationId },
      data: {
        googleAccessToken: tokens.accessToken,
        googleRefreshToken:
          tokens.refreshToken || existing.googleRefreshToken || null,
        googleTokenExpiry: tokens.expiry,
        googleEmail: tokens.email,
        googleCalendarId: existing.googleCalendarId || "primary",
      },
    });

    return NextResponse.redirect(
      new URL(
        "/app/configuracoes?tab=integracoes&google=connected",
        returnOrigin,
      ),
    );
  } catch (e) {
    console.error("[google:callback]", e);
    return NextResponse.redirect(
      new URL("/app/configuracoes?tab=integracoes&google=error", returnOrigin),
    );
  }
}
