import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Healthcheck leve — não passa pela landing (evita 502 por unhealthy). */
export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}
