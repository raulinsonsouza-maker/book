"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import {
  parseVerticalSlug,
  setVerticalCookie,
} from "@/lib/onboarding/verticals";

function SignupRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tipo = parseVerticalSlug(searchParams.get("tipo"));
    if (tipo) setVerticalCookie(tipo);
    const qs = tipo ? `?tipo=${encodeURIComponent(tipo)}` : "";
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
