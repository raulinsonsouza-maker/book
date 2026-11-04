import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isTemarkHost } from "@/lib/app-origin";
import {
  PRODUCT_BRAND_COOKIE,
  PRODUCT_BRAND_COOKIE_MAX_AGE,
} from "@/lib/product-brand";

const LP_COOKIE = "bs_lp_variant";
const LP_MAX_AGE = 60 * 60 * 24 * 30;

function pickVariant(): "a" | "b" {
  return Math.random() < 0.5 ? "a" : "b";
}

function hostOf(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    ""
  );
}

export function proxy(request: NextRequest) {
  const host = hostOf(request);
  const temark = isTemarkHost(host);
  const brandId = temark ? "temark" : "book";

  let response: NextResponse;

  // A/B LP rewrite only on Book apex `/` (not Temark product host)
  if (!temark && request.nextUrl.pathname === "/") {
    const forced = request.nextUrl.searchParams.get("variant");
    const current = request.cookies.get(LP_COOKIE)?.value;

    let variant: "a" | "b";
    if (forced === "a" || forced === "b") {
      variant = forced;
    } else if (current === "a" || current === "b") {
      variant = current;
    } else {
      variant = pickVariant();
    }

    response =
      variant === "b"
        ? NextResponse.rewrite(new URL("/lp-b", request.url))
        : NextResponse.next();

    if (variant !== current) {
      response.cookies.set(LP_COOKIE, variant, {
        path: "/",
        maxAge: LP_MAX_AGE,
        sameSite: "lax",
      });
    }
  } else {
    response = NextResponse.next();
  }

  const existingBrand = request.cookies.get(PRODUCT_BRAND_COOKIE)?.value;
  if (temark || existingBrand !== brandId) {
    response.cookies.set(PRODUCT_BRAND_COOKIE, brandId, {
      path: "/",
      maxAge: PRODUCT_BRAND_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
  }

  response.headers.set("x-product-brand", brandId);
  return response;
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/signup",
    "/signup/:path*",
    "/onboarding",
    "/onboarding/:path*",
    "/app",
    "/app/:path*",
    "/primeiro-acesso",
    "/esqueci-senha",
    "/redefinir-senha",
  ],
};
