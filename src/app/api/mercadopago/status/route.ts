import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  clearMercadoPagoConnection,
  getMercadoPagoRedirectUri,
  mercadoPagoBrandFromOrigin,
  mercadoPagoOAuthConfigured,
} from "@/lib/mercadopago/oauth";
import { isMercadoPagoReady, webhookUrl } from "@/lib/payments/resolve-provider";
import { getRequestAppOrigin } from "@/lib/app-origin-server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
  });

  if (!org) {
    return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
  }

  const origin = await getRequestAppOrigin();
  const brand = mercadoPagoBrandFromOrigin(origin);

  return NextResponse.json({
    oauthConfigured: await mercadoPagoOAuthConfigured(brand),
    connected: isMercadoPagoReady(org),
    userId: org.mercadoPagoUserId,
    connectedAt: org.mercadoPagoConnectedAt,
    viaOAuth: Boolean(org.mercadoPagoRefreshToken),
    webhookUrl: webhookUrl(
      "/api/webhooks/mercadopago",
      brand === "temark" ? "temark" : "book",
    ),
    redirectUri: getMercadoPagoRedirectUri(brand),
  });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  await clearMercadoPagoConnection(session.user.organizationId);
  return NextResponse.json({ ok: true });
}
