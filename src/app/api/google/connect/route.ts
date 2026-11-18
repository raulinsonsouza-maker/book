import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRequestAppOrigin } from "@/lib/app-origin-server";
import {
  createGoogleOAuthState,
  getGoogleAuthUrl,
  googleConfigured,
} from "@/lib/google/calendar";

export async function GET() {
  const returnOrigin = await getRequestAppOrigin();
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId || !session.user.id) {
    return NextResponse.redirect(new URL("/login", returnOrigin));
  }

  if (!googleConfigured()) {
    return NextResponse.redirect(
      new URL("/app/integracoes?google=missing_env", returnOrigin),
    );
  }

  const state = createGoogleOAuthState({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    returnOrigin,
  });

  const url = getGoogleAuthUrl(state);
  return NextResponse.redirect(url);
}
