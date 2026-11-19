import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRequestAppOrigin } from "@/lib/app-origin-server";
import {
  getMercadoPagoAuthUrl,
  mercadoPagoOAuthConfigured,
} from "@/lib/mercadopago/oauth";
import { createMercadoPagoOAuthState } from "@/lib/mercadopago/oauth-state";

function oauthDonePath(base: string, status: string, popup: boolean) {
  const path = popup
    ? `/app/integracoes/mercadopago/oauth-done?mp=${status}`
    : `/app/integracoes/mercadopago?mp=${status}`;
  return new URL(path, base);
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const returnOrigin = await getRequestAppOrigin();
  const popup = new URL(req.url).searchParams.get("popup") === "1";

  if (!session?.user?.organizationId || !session.user.id) {
    return NextResponse.redirect(new URL("/login", returnOrigin));
  }

  if (!(await mercadoPagoOAuthConfigured())) {
    return NextResponse.redirect(
      oauthDonePath(returnOrigin, "missing_env", popup),
    );
  }

  const state = createMercadoPagoOAuthState({
    purpose: "org",
    organizationId: session.user.organizationId,
    userId: session.user.id,
    returnOrigin,
    popup,
  });

  return NextResponse.redirect(await getMercadoPagoAuthUrl(state));
}
