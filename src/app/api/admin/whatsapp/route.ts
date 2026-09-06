import { NextResponse } from "next/server";
import { z } from "zod";
import { apiRequirePlatformAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { encryptSecret, maskSecret, decryptSecret } from "@/lib/platform-secrets";
import {
  getPlatformWhatsAppConfig,
  invalidateWhatsAppConfigCache,
} from "@/lib/whatsapp/config";
import { sendWhatsAppTestOtp } from "@/lib/whatsapp/client";
import { toE164 } from "@/lib/whatsapp/phone";
import { writePlatformAudit } from "@/lib/platform-audit";

export async function GET() {
  const auth = await apiRequirePlatformAdmin();
  if ("error" in auth) return auth.error;

  const row = await prisma.platformWhatsAppConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  const runtime = await getPlatformWhatsAppConfig(true);
  const tokenPlain = decryptSecret(row.accessTokenEncrypted);

  const startMonth = new Date();
  startMonth.setUTCDate(1);
  startMonth.setUTCHours(0, 0, 0, 0);
  const startDay = new Date();
  startDay.setUTCHours(0, 0, 0, 0);

  const [todayCount, monthCount, topOrgs, recentFails] = await Promise.all([
    prisma.whatsAppMessageLog.count({
      where: { createdAt: { gte: startDay }, billable: true },
    }),
    prisma.whatsAppMessageLog.count({
      where: { createdAt: { gte: startMonth }, billable: true },
    }),
    prisma.whatsAppMessageLog.groupBy({
      by: ["organizationId"],
      where: {
        createdAt: { gte: startMonth },
        billable: true,
        organizationId: { not: null },
      },
      _count: { _all: true },
      orderBy: { _count: { organizationId: "desc" } },
      take: 10,
    }),
    prisma.whatsAppMessageLog.findMany({
      where: { status: "failed" },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        organization: { select: { name: true, slug: true } },
      },
    }),
  ]);

  const orgIds = topOrgs
    .map((t) => t.organizationId)
    .filter((id): id is string => Boolean(id));
  const orgs = orgIds.length
    ? await prisma.organization.findMany({
        where: { id: { in: orgIds } },
        select: { id: true, name: true, slug: true },
      })
    : [];
  const orgMap = new Map(orgs.map((o) => [o.id, o]));

  return NextResponse.json({
    config: {
      enabled: row.enabled,
      phoneNumberId: row.phoneNumberId,
      wabaId: row.wabaId,
      displayNumber: row.displayNumber,
      templateOtpName: row.templateOtpName,
      templateReminderName: row.templateReminderName,
      templateConfirmName: row.templateConfirmName,
      webhookVerifyToken: row.webhookVerifyToken,
      defaultButtonBaseUrl: row.defaultButtonBaseUrl,
      lastError: row.lastError,
      lastTestAt: row.lastTestAt,
      hasToken: Boolean(tokenPlain || process.env.WHATSAPP_ACCESS_TOKEN),
      tokenMasked: maskSecret(tokenPlain || process.env.WHATSAPP_ACCESS_TOKEN),
    },
    runtime: {
      ready: Boolean(runtime.enabled && runtime.accessToken && runtime.phoneNumberId),
      phoneNumberId: runtime.phoneNumberId,
    },
    stats: {
      today: todayCount,
      month: monthCount,
      topTenants: topOrgs.map((t) => ({
        organizationId: t.organizationId,
        count: t._count._all,
        name: t.organizationId
          ? orgMap.get(t.organizationId)?.name || "—"
          : "—",
        slug: t.organizationId
          ? orgMap.get(t.organizationId)?.slug || null
          : null,
      })),
      recentFails,
    },
  });
}

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  phoneNumberId: z.string().nullable().optional(),
  wabaId: z.string().nullable().optional(),
  accessToken: z.string().nullable().optional(),
  displayNumber: z.string().nullable().optional(),
  templateOtpName: z.string().min(1).optional(),
  templateReminderName: z.string().min(1).optional(),
  templateConfirmName: z.string().nullable().optional(),
  webhookVerifyToken: z.string().nullable().optional(),
  defaultButtonBaseUrl: z.string().nullable().optional(),
});

export async function PATCH(req: Request) {
  const auth = await apiRequirePlatformAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = patchSchema.parse(await req.json());
    const data: Record<string, unknown> = {};

    if (body.enabled !== undefined) data.enabled = body.enabled;
    if (body.phoneNumberId !== undefined) data.phoneNumberId = body.phoneNumberId;
    if (body.wabaId !== undefined) data.wabaId = body.wabaId;
    if (body.displayNumber !== undefined) data.displayNumber = body.displayNumber;
    if (body.templateOtpName !== undefined)
      data.templateOtpName = body.templateOtpName;
    if (body.templateReminderName !== undefined)
      data.templateReminderName = body.templateReminderName;
    if (body.templateConfirmName !== undefined)
      data.templateConfirmName = body.templateConfirmName;
    if (body.webhookVerifyToken !== undefined)
      data.webhookVerifyToken = body.webhookVerifyToken;
    if (body.defaultButtonBaseUrl !== undefined)
      data.defaultButtonBaseUrl = body.defaultButtonBaseUrl;
    if (body.accessToken !== undefined) {
      data.accessTokenEncrypted = body.accessToken
        ? encryptSecret(body.accessToken)
        : null;
    }

    await prisma.platformWhatsAppConfig.upsert({
      where: { id: "singleton" },
      update: data,
      create: { id: "singleton", ...data },
    });

    invalidateWhatsAppConfigCache();

    await writePlatformAudit({
      actorUserId: auth.user.id,
      action: "whatsapp.config_update",
      targetType: "PlatformWhatsAppConfig",
      targetId: "singleton",
      meta: {
        keys: Object.keys(body).filter((k) => k !== "accessToken"),
        tokenUpdated: body.accessToken !== undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}

const testSchema = z.object({
  phone: z.string().min(8),
});

export async function POST(req: Request) {
  const auth = await apiRequirePlatformAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = testSchema.parse(await req.json());
    const e164 = toE164(body.phone);
    if (!e164) {
      return NextResponse.json({ error: "Telefone inválido" }, { status: 400 });
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const result = await sendWhatsAppTestOtp(e164, code);

    await prisma.platformWhatsAppConfig.update({
      where: { id: "singleton" },
      data: {
        lastTestAt: new Date(),
        lastError: result.ok ? null : result.error || "test_failed",
      },
    });
    invalidateWhatsAppConfigCache();

    await writePlatformAudit({
      actorUserId: auth.user.id,
      action: "whatsapp.test_otp",
      targetType: "PlatformWhatsAppConfig",
      targetId: "singleton",
      meta: { to: e164, ok: result.ok },
    });

    return NextResponse.json({
      ok: result.ok,
      error: result.error,
      debugCode:
        process.env.NODE_ENV !== "production" ? code : undefined,
    });
  } catch {
    return NextResponse.json({ error: "Falha no teste" }, { status: 400 });
  }
}
