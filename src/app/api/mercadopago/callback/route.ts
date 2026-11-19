import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BOOK_APP_HOST, defaultAppOrigin } from "@/lib/app-origin";
import {
  exchangeMercadoPagoCode,
  saveMercadoPagoTokens,
} from "@/lib/mercadopago/oauth";
import { parseMercadoPagoOAuthState } from "@/lib/mercadopago/oauth-state";
import {
  exchangePlatformMercadoPagoCode,
  savePlatformMpOAuthTokens,
  setPlatformMpLastError,
} from "@/lib/billing/platform-mercadopago-config";
import { writePlatformAudit } from "@/lib/platform-audit";

function fallbackOrigin() {
  return (
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    `https://${BOOK_APP_HOST}` ||
    defaultAppOrigin()
  ).replace(/\/$/, "");
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const parsed = parseMercadoPagoOAuthState(state);
  const returnOrigin = parsed?.returnOrigin || fallbackOrigin();
  const popup = Boolean(parsed?.popup);
  const isPlatform = parsed?.purpose === "platform";

  function done(status: string) {
    if (isPlatform) {
      const path = popup
        ? `/admin/config/mercadopago-oauth-done?mp=${status}`
        : `/admin/config?mp=${status}`;
      return NextResponse.redirect(new URL(path, returnOrigin));
    }
    const path = popup
      ? `/app/integracoes/mercadopago/oauth-done?mp=${status}`
      : `/app/integracoes/mercadopago?mp=${status}`;
    return NextResponse.redirect(new URL(path, returnOrigin));
  }

  if (error || !code || !parsed) {
    if (isPlatform) {
      await setPlatformMpLastError(error || "missing_code");
    }
    return done("error");
  }

  try {
    if (isPlatform) {
      if (
        !session?.user?.isPlatformAdmin ||
        parsed.userId !== session.user.id
      ) {
        return done("forbidden");
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
      return done("connected");
    }

    if (!parsed.organizationId) {
      return done("error");
    }

    // State assinado basta: o callback canônico pode ser no host Book
    // enquanto a sessão do usuário está no Temark (cookie por domínio).
    if (session?.user?.id && parsed.userId !== session.user.id) {
      return done("forbidden");
    }
    if (
      session?.user?.organizationId &&
      parsed.organizationId !== session.user.organizationId
    ) {
      return done("forbidden");
    }

    const tokens = await exchangeMercadoPagoCode(code);
    await saveMercadoPagoTokens(parsed.organizationId, tokens);
    return done("connected");
  } catch (e) {
    console.error("[mercadopago:callback]", e);
    if (isPlatform) {
      await setPlatformMpLastError(
        e instanceof Error ? e.message : "oauth_error",
      );
    }
    return done("error");
  }
}
