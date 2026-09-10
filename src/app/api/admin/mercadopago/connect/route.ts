import { NextResponse } from "next/server";
import { apiRequirePlatformAdmin } from "@/lib/rbac";
import {
  getPlatformMercadoPagoAuthUrl,
  mercadoPagoOAuthAppConfigured,
} from "@/lib/billing/platform-mercadopago-config";

function oauthDonePath(base: string, status: string, popup: boolean) {
  const path = popup
    ? `/admin/config/mercadopago-oauth-done?mp=${status}`
    : `/admin/config?mp=${status}`;
  return new URL(path, base);
}

export async function GET(req: Request) {
  const auth = await apiRequirePlatformAdmin();
  const base =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  const popup = new URL(req.url).searchParams.get("popup") === "1";

  if ("error" in auth) {
    return NextResponse.redirect(new URL("/login", base));
  }

  if (!(await mercadoPagoOAuthAppConfigured())) {
    return NextResponse.redirect(oauthDonePath(base, "missing_env", popup));
  }

  const state = Buffer.from(
    JSON.stringify({
      purpose: "platform",
      userId: auth.user.id,
      popup,
    }),
  ).toString("base64url");

  try {
    return NextResponse.redirect(await getPlatformMercadoPagoAuthUrl(state));
  } catch {
    return NextResponse.redirect(oauthDonePath(base, "missing_env", popup));
  }
}
