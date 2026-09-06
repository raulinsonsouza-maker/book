import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlatformWhatsAppConfig } from "@/lib/whatsapp/config";

export async function GET(req: NextRequest) {
  const cfg = await getPlatformWhatsAppConfig();
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token &&
    cfg.webhookVerifyToken &&
    token === cfg.webhookVerifyToken
  ) {
    return new NextResponse(challenge || "", { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

type StatusPayload = {
  entry?: {
    changes?: {
      value?: {
        statuses?: {
          id?: string;
          status?: string;
          errors?: { title?: string }[];
        }[];
      };
    }[];
  }[];
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as StatusPayload;
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        for (const st of change.value?.statuses || []) {
          if (!st.id) continue;
          await prisma.whatsAppMessageLog.updateMany({
            where: { metaMessageId: st.id },
            data: {
              status: st.status || "unknown",
              error: st.errors?.[0]?.title || null,
            },
          });
        }
      }
    }
  } catch (e) {
    console.error("[wa-webhook]", e);
  }
  return NextResponse.json({ ok: true });
}
