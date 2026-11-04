import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRequestAppOrigin } from "@/lib/app-origin-server";
import { getGoogleAuthUrl, googleConfigured } from "@/lib/google/calendar";

export async function GET() {
  const base = await getRequestAppOrigin();
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.redirect(new URL("/login", base));
  }

  if (!googleConfigured()) {
    return NextResponse.redirect(
      new URL("/app/integracoes?google=missing_env", base),
    );
  }

  const state = Buffer.from(
    JSON.stringify({
      organizationId: session.user.organizationId,
      userId: session.user.id,
    }),
  ).toString("base64url");

  const url = getGoogleAuthUrl(state, base);
  return NextResponse.redirect(url);
}
