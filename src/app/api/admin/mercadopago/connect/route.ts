import { NextResponse } from "next/server";
import { apiRequirePlatformAdmin } from "@/lib/rbac";
import { getRequestAppOrigin } from "@/lib/app-origin-server";
import {
  getPlatformMercadoPagoAuthUrl,
  mercadoPagoOAuthAppConfigured,
} from "@/lib/billing/platform-mercadopago-config";
import { createMercadoPagoOAuthState } from "@/lib/mercadopago/oauth-state";

function oauthDonePath(base: string, status: string, popup: boolean) {
  const path = popup
    ? `/admin/config/mercadopago-oauth-done?mp=${status}`
    : `/admin/config?mp=${status}`;
  return new URL(path, base);
}

export async function GET(req: Request) {
  const auth = await apiRequirePlatformAdmin();
  const returnOrigin = await getRequestAppOrigin();
  const popup = new URL(req.url).searchParams.get("popup") === "1";

  if ("error" in auth) {
    return NextResponse.redirect(new URL("/login", returnOrigin));
  }

  if (!(await mercadoPagoOAuthAppConfigured())) {
    return NextResponse.redirect(
      oauthDonePath(returnOrigin, "missing_env", popup),
    );
  }

  const state = createMercadoPagoOAuthState({
    purpose: "platform",
    userId: auth.user.id,
    returnOrigin,
    popup,
  });

  try {
    return NextResponse.redirect(await getPlatformMercadoPagoAuthUrl(state));
  } catch {
    return NextResponse.redirect(
      oauthDonePath(returnOrigin, "missing_env", popup),
    );
  }
}
