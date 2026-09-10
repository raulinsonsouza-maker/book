import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  exchangePlatformMercadoPagoCode,
  savePlatformMpOAuthTokens,
  setPlatformMpLastError,
} from "@/lib/billing/platform-mercadopago-config";
import { writePlatformAudit } from "@/lib/platform-audit";

export async function GET(req: Request) {
  const base =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  const session = await getServerSession(authOptions);

  if (!session?.user?.isPlatformAdmin) {
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
      ? `/admin/config/mercadopago-oauth-done?mp=${status}`
      : `/admin/config?mp=${status}`;
    return NextResponse.redirect(new URL(path, base));
  }

  let popup = parsePopup(state);

  if (error || !code || !state) {
    await setPlatformMpLastError(error || "missing_code");
    return done("error", popup);
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8"),
    ) as { purpose?: string; userId?: string; popup?: boolean };

    popup = Boolean(parsed.popup);

    if (parsed.purpose !== "platform" || parsed.userId !== session.user.id) {
      return done("forbidden", popup);
    }

    const tokens = await exchangePlatformMercadoPagoCode(code);
    await savePlatformMpOAuthTokens(tokens);
    await writePlatformAudit({
      actorUserId: session.user.id,
      action: "platform_mp.oauth_connected",
      targetType: "PlatformMercadoPagoConfig",
      targetId: "singleton",
      meta: { userId: tokens.userId, nickname: tokens.nickname },
    });

    return done("connected", popup);
  } catch (e) {
    console.error("[admin/mercadopago:callback]", e);
    await setPlatformMpLastError(
      e instanceof Error ? e.message : "oauth_error",
    );
    return done("error", popup);
  }
}
