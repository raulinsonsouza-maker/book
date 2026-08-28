import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  exchangeMercadoPagoCode,
  saveMercadoPagoTokens,
} from "@/lib/mercadopago/oauth";

export async function GET(req: Request) {
  const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
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
      new URL("/app/integrations/mercadopago?mp=error", base),
    );
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8"),
    ) as { organizationId?: string };

    if (parsed.organizationId !== session.user.organizationId) {
      return NextResponse.redirect(
        new URL("/app/integrations/mercadopago?mp=forbidden", base),
      );
    }

    const tokens = await exchangeMercadoPagoCode(code);
    await saveMercadoPagoTokens(session.user.organizationId, tokens);

    return NextResponse.redirect(
      new URL("/app/integrations/mercadopago?mp=connected", base),
    );
  } catch (e) {
    console.error("[mercadopago:callback]", e);
    return NextResponse.redirect(
      new URL("/app/integrations/mercadopago?mp=error", base),
    );
  }
}
