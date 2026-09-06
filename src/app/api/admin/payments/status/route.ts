import { NextResponse } from "next/server";
import { apiRequirePlatformAdmin } from "@/lib/rbac";
import {
  isPlatformBillingEnabled,
  platformMercadoPagoConfigured,
} from "@/lib/billing/platform";
import { pingPlatformMercadoPago } from "@/lib/billing/mercadopago-platform";

export async function GET() {
  const auth = await apiRequirePlatformAdmin();
  if ("error" in auth) return auth.error;

  const configured = platformMercadoPagoConfigured();
  const ping = configured ? await pingPlatformMercadoPago() : null;

  return NextResponse.json({
    configured,
    billingEnabled: isPlatformBillingEnabled(),
    ping,
  });
}
