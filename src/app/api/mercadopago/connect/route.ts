import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getMercadoPagoAuthUrl,
  mercadoPagoOAuthConfigured,
} from "@/lib/mercadopago/oauth";

export async function GET() {
  const session = await getServerSession(authOptions);
  const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!session?.user?.organizationId) {
    return NextResponse.redirect(new URL("/login", base));
  }

  if (!mercadoPagoOAuthConfigured()) {
    return NextResponse.redirect(
      new URL("/app/integrations/mercadopago?mp=missing_env", base),
    );
  }

  const state = Buffer.from(
    JSON.stringify({
      organizationId: session.user.organizationId,
      userId: session.user.id,
    }),
  ).toString("base64url");

  return NextResponse.redirect(getMercadoPagoAuthUrl(state));
}
