import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isCaktoReady,
  isMercadoPagoReady,
  webhookUrl,
} from "@/lib/payments/resolve-provider";
import { mercadoPagoOAuthConfigured } from "@/lib/mercadopago/oauth";
import { CAKTO_ENABLED } from "@/lib/feature-flags";

const schema = z.object({
  name: z.string().min(2).optional(),
  timezone: z.string().optional(),
  paymentProvider: z.enum(["CAKTO", "MERCADO_PAGO"]).optional(),
  caktoClientId: z.string().nullable().optional(),
  caktoClientSecret: z.string().nullable().optional(),
  caktoSdkClientId: z.string().nullable().optional(),
  caktoOfferId: z.string().nullable().optional(),
  mercadoPagoAccessToken: z.string().nullable().optional(),
  mercadoPagoPublicKey: z.string().nullable().optional(),
});

function serializeOrg(org: {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  paymentProvider: "CAKTO" | "MERCADO_PAGO";
  caktoClientId: string | null;
  caktoSdkClientId: string | null;
  caktoClientSecret: string | null;
  caktoOfferId: string | null;
  mercadoPagoAccessToken: string | null;
  mercadoPagoPublicKey: string | null;
  mercadoPagoRefreshToken?: string | null;
  mercadoPagoUserId?: string | null;
  mercadoPagoConnectedAt?: Date | null;
}) {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    timezone: org.timezone,
    paymentProvider: org.paymentProvider,
    caktoClientId: org.caktoClientId,
    caktoSdkClientId: org.caktoSdkClientId,
    caktoOfferId: org.caktoOfferId,
    hasCaktoSecret: Boolean(org.caktoClientSecret),
    caktoConnected: isCaktoReady(org),
    mercadoPagoPublicKey: org.mercadoPagoPublicKey,
    hasMercadoPagoToken: Boolean(org.mercadoPagoAccessToken),
    mercadoPagoConnected: isMercadoPagoReady(org),
    mercadoPagoViaOAuth: Boolean(org.mercadoPagoRefreshToken),
    mercadoPagoUserId: org.mercadoPagoUserId ?? null,
    mercadoPagoOAuthConfigured: mercadoPagoOAuthConfigured(),
    mercadoPagoWebhookUrl: webhookUrl("/api/webhooks/mercadopago"),
    mercadoPagoRedirectUri:
      process.env.MERCADOPAGO_REDIRECT_URI ||
      `${(process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "")}/api/mercadopago/callback`,
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
  });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(serializeOrg(org));
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const raw = await req.json();
    const body = schema.parse(raw);

    const current = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
    });
    if (!current) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    if (body.name !== undefined) data.name = body.name;
    if (body.timezone !== undefined) data.timezone = body.timezone;

    if (body.paymentProvider !== undefined) {
      if (body.paymentProvider === "CAKTO") {
        if (!CAKTO_ENABLED) {
          return NextResponse.json(
            { error: "Integração Cakto indisponível no momento" },
            { status: 400 },
          );
        }
        if (!isCaktoReady(current)) {
          return NextResponse.json(
            { error: "Conecte a Cakto antes de defini-la como padrão" },
            { status: 400 },
          );
        }
      }
      if (body.paymentProvider === "MERCADO_PAGO" && !isMercadoPagoReady(current)) {
        return NextResponse.json(
          { error: "Conecte o Mercado Pago antes de defini-lo como padrão" },
          { status: 400 },
        );
      }
      data.paymentProvider = body.paymentProvider;
    }

    if ("caktoClientId" in raw) {
      const id =
        typeof body.caktoClientId === "string"
          ? body.caktoClientId.trim() || null
          : null;
      data.caktoClientId = id;
      data.caktoSdkClientId = id;
    }
    if ("caktoClientSecret" in raw) {
      data.caktoClientSecret =
        typeof body.caktoClientSecret === "string"
          ? body.caktoClientSecret.trim() || null
          : null;
    }
    if ("caktoOfferId" in raw) {
      data.caktoOfferId =
        typeof body.caktoOfferId === "string"
          ? body.caktoOfferId.trim() || null
          : null;
    }
    if ("caktoSdkClientId" in raw && !("caktoClientId" in raw)) {
      data.caktoSdkClientId =
        typeof body.caktoSdkClientId === "string"
          ? body.caktoSdkClientId.trim() || null
          : null;
    }
    if ("mercadoPagoAccessToken" in raw) {
      data.mercadoPagoAccessToken =
        typeof body.mercadoPagoAccessToken === "string"
          ? body.mercadoPagoAccessToken.trim() || null
          : null;
    }
    if ("mercadoPagoPublicKey" in raw) {
      data.mercadoPagoPublicKey =
        typeof body.mercadoPagoPublicKey === "string"
          ? body.mercadoPagoPublicKey.trim() || null
          : null;
    }

    const org = await prisma.organization.update({
      where: { id: session.user.organizationId },
      data,
    });
    return NextResponse.json(serializeOrg(org));
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}
