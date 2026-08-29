import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGoogleAuthUrl, googleConfigured } from "@/lib/google/calendar";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL));
  }

  if (!googleConfigured()) {
    return NextResponse.redirect(
      new URL(
        "/app/integrations?google=missing_env",
        process.env.NEXTAUTH_URL || "http://localhost:3000",
      ),
    );
  }

  const state = Buffer.from(
    JSON.stringify({
      organizationId: session.user.organizationId,
      userId: session.user.id,
    }),
  ).toString("base64url");

  const url = getGoogleAuthUrl(state);
  return NextResponse.redirect(url);
}
