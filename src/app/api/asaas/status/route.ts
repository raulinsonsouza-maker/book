import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ASAAS_ENABLED, CAKTO_ENABLED } from "@/lib/feature-flags";
import {
  ensureAsaasWebhook,
  validateAsaasApiKey,
} from "@/lib/asaas/client";
import { isAsaasReady, webhookUrl } from "@/lib/payments/resolve-provider";

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
    enabled: ASAAS_ENABLED,
    connected: isAsaasReady(org),
    email: org.asaasAccountEmail,
    walletId: org.asaasWalletId,
    connectedAt: org.asaasConnectedAt,
    webhookUrl: webhookUrl("/api/webhooks/asaas"),
  });
}

const connectSchema = z.object({
  apiKey: z.string().min(20),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ASAAS_ENABLED) {
    return NextResponse.json(
      { error: "Integração Asaas indisponível" },
      { status: 400 },
    );
  }

  try {
    const body = connectSchema.parse(await req.json());
    const apiKey = body.apiKey.trim();
    const account = await validateAsaasApiKey(apiKey);
    const webhookToken = randomBytes(32).toString("hex");

    try {
      await ensureAsaasWebhook({
        apiKey,
        authToken: webhookToken,
        email: account.email,
      });
    } catch (e) {
      console.warn("[asaas:webhook-setup]", e);
    }

    const org = await prisma.organization.update({
      where: { id: session.user.organizationId },
      data: {
        asaasApiKey: apiKey,
        asaasAccountEmail: account.email,
        asaasWalletId: account.walletId,
        asaasWebhookToken: webhookToken,
        asaasConnectedAt: new Date(),
        paymentProvider: "ASAAS",
      },
    });

    return NextResponse.json({
      ok: true,
      connected: true,
      email: org.asaasAccountEmail,
      walletId: org.asaasWalletId,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Informe a API Key" }, { status: 400 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao conectar Asaas" },
      { status: 400 },
    );
  }
}

export async function DELETE() {
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

  const nextProvider =
    org.paymentProvider === "ASAAS"
      ? org.mercadoPagoAccessToken && org.mercadoPagoPublicKey
        ? "MERCADO_PAGO"
        : CAKTO_ENABLED &&
            org.caktoClientId &&
            org.caktoClientSecret &&
            org.caktoOfferId
          ? "CAKTO"
          : undefined
      : undefined;

  await prisma.organization.update({
    where: { id: session.user.organizationId },
    data: {
      asaasApiKey: null,
      asaasAccountEmail: null,
      asaasWalletId: null,
      asaasWebhookToken: null,
      asaasConnectedAt: null,
      ...(nextProvider ? { paymentProvider: nextProvider } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
