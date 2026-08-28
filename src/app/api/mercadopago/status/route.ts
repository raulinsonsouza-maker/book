import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  clearMercadoPagoConnection,
  mercadoPagoOAuthConfigured,
} from "@/lib/mercadopago/oauth";
import { isMercadoPagoReady, webhookUrl } from "@/lib/payments/resolve-provider";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
  });

  if (!org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    oauthConfigured: mercadoPagoOAuthConfigured(),
    connected: isMercadoPagoReady(org),
    userId: org.mercadoPagoUserId,
    connectedAt: org.mercadoPagoConnectedAt,
    viaOAuth: Boolean(org.mercadoPagoRefreshToken),
    webhookUrl: webhookUrl("/api/webhooks/mercadopago"),
    redirectUri:
      process.env.MERCADOPAGO_REDIRECT_URI ||
      `${(process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "")}/api/mercadopago/callback`,
  });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await clearMercadoPagoConnection(session.user.organizationId);
  return NextResponse.json({ ok: true });
}
