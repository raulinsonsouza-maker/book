import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  exchangeMercadoPagoCode,
  saveMercadoPagoTokens,
} from "@/lib/mercadopago/oauth";
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

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", base));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  function parseState(stateParam: string | null) {
    if (!stateParam) return null;
    try {
      return JSON.parse(
        Buffer.from(stateParam, "base64url").toString("utf8"),
      ) as {
        purpose?: string;
        organizationId?: string;
        userId?: string;
        popup?: boolean;
      };
    } catch {
      return null;
    }
  }

  const parsed = parseState(state);
  const popup = Boolean(parsed?.popup);
  const isPlatform = parsed?.purpose === "platform";

  function done(status: string) {
    if (isPlatform) {
      const path = popup
        ? `/admin/config/mercadopago-oauth-done?mp=${status}`
        : `/admin/config?mp=${status}`;
      return NextResponse.redirect(new URL(path, base));
    }
    const path = popup
      ? `/app/integracoes/mercadopago/oauth-done?mp=${status}`
      : `/app/integracoes/mercadopago?mp=${status}`;
    return NextResponse.redirect(new URL(path, base));
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
        !session.user.isPlatformAdmin ||
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

    if (!session.user.organizationId) {
      return NextResponse.redirect(new URL("/login", base));
    }

    if (parsed.organizationId !== session.user.organizationId) {
      return done("forbidden");
    }

    const tokens = await exchangeMercadoPagoCode(code);
    await saveMercadoPagoTokens(session.user.organizationId, tokens);
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
