"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import {
  parseVerticalSlug,
  setVerticalCookie,
} from "@/lib/onboarding/verticals";
import {
  parseProductBrand,
  setProductBrandCookie,
} from "@/lib/product-brand";

function SignupRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const brand = parseProductBrand(searchParams.get("brand"));
    if (brand) setProductBrandCookie(brand);
    const tipo = parseVerticalSlug(searchParams.get("tipo"));
    if (tipo) setVerticalCookie(tipo);
    const params = new URLSearchParams();
    if (brand) params.set("brand", brand);
    if (tipo) params.set("tipo", tipo);
    const qs = params.toString() ? `?${params}` : "";
    router.replace(`/onboarding${qs}`);
  }, [router, searchParams]);

  return (
    <div className="dot-grid flex min-h-screen items-center justify-center px-4">
      <p className="text-sm text-muted">Abrindo configuração…</p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="dot-grid flex min-h-screen items-center justify-center px-4">
          <p className="text-sm text-muted">Carregando…</p>
        </div>
      }
    >
      <SignupRedirect />
    </Suspense>
  );
}
