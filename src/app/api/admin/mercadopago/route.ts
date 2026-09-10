import { NextResponse } from "next/server";
import { z } from "zod";
import { apiRequirePlatformAdmin } from "@/lib/rbac";
import { pingPlatformMercadoPago } from "@/lib/billing/mercadopago-platform";
import {
  clearPlatformMpConnection,
  getPlatformMpAdminStatus,
  savePlatformMpManualCredentials,
} from "@/lib/billing/platform-mercadopago-config";
import { writePlatformAudit } from "@/lib/platform-audit";

export async function GET() {
  const auth = await apiRequirePlatformAdmin();
  if ("error" in auth) return auth.error;

  const status = await getPlatformMpAdminStatus();
  const ping = status.connected ? await pingPlatformMercadoPago() : null;

  return NextResponse.json({ ...status, ping });
}

const patchSchema = z.object({
  billingEnabled: z.boolean().optional(),
  clientId: z.string().nullable().optional(),
  clientSecret: z.string().nullable().optional(),
  accessToken: z.string().nullable().optional(),
  publicKey: z.string().nullable().optional(),
});

export async function PATCH(req: Request) {
  const auth = await apiRequirePlatformAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = patchSchema.parse(await req.json());
    await savePlatformMpManualCredentials(body);
    await writePlatformAudit({
      actorUserId: auth.user.id,
      action: "platform_mp.config_save",
      targetType: "PlatformMercadoPagoConfig",
      targetId: "singleton",
      meta: {
        billingEnabled: body.billingEnabled,
        hasClientId: body.clientId != null,
        hasClientSecret: Boolean(body.clientSecret?.trim()),
        hasAccessToken: Boolean(body.accessToken?.trim()),
        hasPublicKey: body.publicKey != null,
      },
    });
    const status = await getPlatformMpAdminStatus();
    const ping = status.connected ? await pingPlatformMercadoPago() : null;
    return NextResponse.json({ ...status, ping });
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}

export async function DELETE() {
  const auth = await apiRequirePlatformAdmin();
  if ("error" in auth) return auth.error;

  await clearPlatformMpConnection();
  await writePlatformAudit({
    actorUserId: auth.user.id,
    action: "platform_mp.disconnect",
    targetType: "PlatformMercadoPagoConfig",
    targetId: "singleton",
  });
  return NextResponse.json(await getPlatformMpAdminStatus());
}
