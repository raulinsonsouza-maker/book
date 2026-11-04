import NextAuth from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { originFromHost } from "@/lib/app-origin";

const nextAuthHandler = NextAuth(authOptions);

type RouteCtx = { params: Promise<{ nextauth: string[] }> };

/**
 * Align NEXTAUTH_URL with the request Host so credentials/OAuth
 * cookies and callbacks stay on book.symbius.com.br or app.temark.com.br.
 */
function applyRequestOrigin(req: NextRequest) {
  const host =
    req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!host) return;
  const proto = req.headers.get("x-forwarded-proto");
  process.env.NEXTAUTH_URL = originFromHost(host, proto);
}

async function GET(req: NextRequest, ctx: RouteCtx) {
  applyRequestOrigin(req);
  return nextAuthHandler(req, ctx);
}

async function POST(req: NextRequest, ctx: RouteCtx) {
  applyRequestOrigin(req);
  return nextAuthHandler(req, ctx);
}

export { GET, POST };
