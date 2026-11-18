import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isTemarkAppHost, isTemarkHost } from "@/lib/app-origin";
import {
  PRODUCT_BRAND_COOKIE,
  PRODUCT_BRAND_COOKIE_MAX_AGE,
} from "@/lib/product-brand";

function hostOf(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    ""
  );
}

function hasAuthSession(request: NextRequest): boolean {
  return Boolean(
    request.cookies.get("__Secure-next-auth.session-token")?.value ||
      request.cookies.get("next-auth.session-token")?.value,
  );
}

export function proxy(request: NextRequest) {
  const host = hostOf(request);
  const temark = isTemarkHost(host);
  const brandId = temark ? "temark" : "book";
  const { pathname } = request.nextUrl;

  // app.temark.com.br is the panel entry — never show the marketing LP.
  if (isTemarkAppHost(host) && pathname === "/") {
    const dest = new URL(
      hasAuthSession(request) ? "/app" : "/login",
      request.url,
    );
    const redirect = NextResponse.redirect(dest);
    redirect.cookies.set(PRODUCT_BRAND_COOKIE, "temark", {
      path: "/",
      maxAge: PRODUCT_BRAND_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
    redirect.headers.set("x-product-brand", "temark");
    return redirect;
  }

  const response = NextResponse.next();

  // Drop the unfinished A/B cookie so `/` is never rewritten to the missing /lp-b page.
  if (request.cookies.get("bs_lp_variant")) {
    response.cookies.set("bs_lp_variant", "", {
      path: "/",
      maxAge: 0,
      sameSite: "lax",
    });
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
