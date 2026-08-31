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

  function parsePopup(stateParam: string | null) {
    if (!stateParam) return false;
    try {
      const parsed = JSON.parse(
        Buffer.from(stateParam, "base64url").toString("utf8"),
      ) as { popup?: boolean };
      return Boolean(parsed.popup);
    } catch {
      return false;
    }
  }

  function done(status: string, popup = false) {
    const path = popup
      ? `/app/integracoes/mercadopago/oauth-done?mp=${status}`
      : `/app/integracoes/mercadopago?mp=${status}`;
    return NextResponse.redirect(new URL(path, base));
  }

  let popup = parsePopup(state);

  if (error || !code || !state) {
    return done("error", popup);
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8"),
    ) as { organizationId?: string; popup?: boolean };

    popup = Boolean(parsed.popup);

    if (parsed.organizationId !== session.user.organizationId) {
      return done("forbidden", popup);
    }

    const tokens = await exchangeMercadoPagoCode(code);
    await saveMercadoPagoTokens(session.user.organizationId, tokens);

    return done("connected", popup);
  } catch (e) {
    console.error("[mercadopago:callback]", e);
    return done("error", popup);
  }
}
