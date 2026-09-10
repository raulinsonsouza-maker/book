import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

let running = false;

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function authorize(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const query = new URL(req.url).searchParams.get("secret") || "";
  return bearer === secret || query === secret;
}

/**
 * Cron enxuto: só libera holds expirados.
 * Lembretes/e-mail/WhatsApp foram removidos daqui porque travavam o
 * event loop (Prisma/SQLite + I/O externo) e derrubavam o healthcheck.
 */
export async function POST(req: Request) {
  if (!authorize(req)) return unauthorized();

  if (running) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "already_running",
    });
  }

  running = true;
  const startedAt = Date.now();
  const now = new Date();

  try {
    const expired = await prisma.booking.updateMany({
      where: {
        status: "PENDING_PAYMENT",
        holdExpiresAt: { lt: now },
      },
      data: { status: "EXPIRED" },
    });
    const holds = await prisma.slotHold.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    return NextResponse.json({
      ok: true,
      at: now.toISOString(),
      ms: Date.now() - startedAt,
      summary: {
        expiredHolds: expired.count,
        expiredSlotHolds: holds.count,
        reminders: 0,
        pixPending: 0,
        feedback: 0,
      },
    });
  } catch (e) {
    console.error("[cron:booking-comms]", e);
    return NextResponse.json(
      { ok: false, error: "cron_failed" },
      { status: 500 },
    );
  } finally {
    running = false;
  }
}

export async function GET(req: Request) {
  return POST(req);
}
