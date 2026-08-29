import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isAsaasReady,
  isCaktoReady,
  isMercadoPagoReady,
  webhookUrl,
} from "@/lib/payments/resolve-provider";
import { mercadoPagoOAuthConfigured } from "@/lib/mercadopago/oauth";
import { ASAAS_ENABLED, CAKTO_ENABLED } from "@/lib/feature-flags";

const schema = z.object({
  name: z.string().min(2).optional(),
  timezone: z.string().optional(),
  paymentProvider: z.enum(["CAKTO", "MERCADO_PAGO", "ASAAS"]).optional(),
  caktoClientId: z.string().nullable().optional(),
  caktoClientSecret: z.string().nullable().optional(),
  caktoSdkClientId: z.string().nullable().optional(),
  caktoOfferId: z.string().nullable().optional(),
  mercadoPagoAccessToken: z.string().nullable().optional(),
  mercadoPagoPublicKey: z.string().nullable().optional(),
  asaasApiKey: z.string().nullable().optional(),
  notifyClientConfirmation: z.boolean().optional(),
  notifyClientReminder: z.boolean().optional(),
  notifyClientFeedback: z.boolean().optional(),
  notifyProNewBooking: z.boolean().optional(),
  notifyProCancellation: z.boolean().optional(),
  notifyProReschedule: z.boolean().optional(),
  reminderHoursBefore: z.union([z.literal(0), z.literal(2), z.literal(12), z.literal(24)]).optional(),
});

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  paymentProvider: "CAKTO" | "MERCADO_PAGO" | "ASAAS";
  caktoClientId: string | null;
  caktoSdkClientId: string | null;
  caktoClientSecret: string | null;
  caktoOfferId: string | null;
  mercadoPagoAccessToken: string | null;
  mercadoPagoPublicKey: string | null;
  mercadoPagoRefreshToken?: string | null;
  mercadoPagoUserId?: string | null;
  mercadoPagoConnectedAt?: Date | null;
  asaasApiKey: string | null;
  asaasAccountEmail: string | null;
  asaasWalletId: string | null;
  asaasConnectedAt: Date | null;
  notifyClientConfirmation: boolean;
  notifyClientReminder: boolean;
  notifyClientFeedback: boolean;
  notifyProNewBooking: boolean;
  notifyProCancellation: boolean;
  notifyProReschedule: boolean;
  reminderHoursBefore: number;
};

function serializeOrg(org: OrgRow) {
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
    asaasEnabled: ASAAS_ENABLED,
    asaasConnected: isAsaasReady(org),
    asaasAccountEmail: org.asaasAccountEmail ?? null,
    asaasWalletId: org.asaasWalletId ?? null,
    hasAsaasApiKey: Boolean(org.asaasApiKey),
    asaasWebhookUrl: webhookUrl("/api/webhooks/asaas"),
    notifyClientConfirmation: org.notifyClientConfirmation,
    notifyClientReminder: org.notifyClientReminder,
    notifyClientFeedback: org.notifyClientFeedback,
    notifyProNewBooking: org.notifyProNewBooking,
    notifyProCancellation: org.notifyProCancellation,
    notifyProReschedule: org.notifyProReschedule,
    reminderHoursBefore: org.reminderHoursBefore,
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
      if (body.paymentProvider === "ASAAS") {
        if (!ASAAS_ENABLED) {
          return NextResponse.json(
            { error: "Integração Asaas indisponível no momento" },
            { status: 400 },
          );
        }
        if (!isAsaasReady(current)) {
          return NextResponse.json(
            { error: "Conecte o Asaas antes de defini-lo como padrão" },
            { status: 400 },
          );
        }
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
    if ("asaasApiKey" in raw) {
      data.asaasApiKey =
        typeof body.asaasApiKey === "string"
          ? body.asaasApiKey.trim() || null
          : null;
      if (!data.asaasApiKey) {
        data.asaasAccountEmail = null;
        data.asaasWalletId = null;
        data.asaasWebhookToken = null;
        data.asaasConnectedAt = null;
      }
    }

    if (body.notifyClientConfirmation !== undefined) {
      data.notifyClientConfirmation = body.notifyClientConfirmation;
    }
    if (body.notifyClientReminder !== undefined) {
      data.notifyClientReminder = body.notifyClientReminder;
    }
    if (body.notifyClientFeedback !== undefined) {
      data.notifyClientFeedback = body.notifyClientFeedback;
    }
    if (body.notifyProNewBooking !== undefined) {
      data.notifyProNewBooking = body.notifyProNewBooking;
    }
    if (body.notifyProCancellation !== undefined) {
      data.notifyProCancellation = body.notifyProCancellation;
    }
    if (body.notifyProReschedule !== undefined) {
      data.notifyProReschedule = body.notifyProReschedule;
    }
    if (body.reminderHoursBefore !== undefined) {
      data.reminderHoursBefore = body.reminderHoursBefore;
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
