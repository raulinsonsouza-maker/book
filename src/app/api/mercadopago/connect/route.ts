import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getMercadoPagoAuthUrl,
  mercadoPagoOAuthConfigured,
} from "@/lib/mercadopago/oauth";

function oauthDonePath(base: string, status: string, popup: boolean) {
  const path = popup
    ? `/app/integrations/mercadopago/oauth-done?mp=${status}`
    : `/app/integrations/mercadopago?mp=${status}`;
  return new URL(path, base);
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const popup = new URL(req.url).searchParams.get("popup") === "1";

  if (!session?.user?.organizationId) {
    return NextResponse.redirect(new URL("/login", base));
  }

  if (!mercadoPagoOAuthConfigured()) {
    return NextResponse.redirect(oauthDonePath(base, "missing_env", popup));
  }

  const state = Buffer.from(
    JSON.stringify({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      popup,
    }),
  ).toString("base64url");

  return NextResponse.redirect(getMercadoPagoAuthUrl(state));
}
