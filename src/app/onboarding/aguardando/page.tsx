"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";

export default function OnboardingAguardandoPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [message, setMessage] = useState("Confirmando seu pagamento…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/onboarding/aguardando");
      return;
    }
    if (status !== "authenticated") return;

    let cancelled = false;
    let tries = 0;

    async function poll() {
      tries += 1;
      try {
        const res = await fetch("/api/billing/status");
        const data = await res.json();
        if (cancelled) return;

        if (data.status === "ACTIVE") {
          await update();
          setMessage("Pagamento confirmado! Abrindo o painel…");
          window.location.assign("/app");
          return;
        }

        if (tries >= 40) {
          setFailed(true);
          setMessage(
            "Ainda não confirmamos o pagamento. Se você já pagou, aguarde alguns minutos ou entre no painel.",
          );
          return;
        }

        setMessage("Aguardando confirmação do Mercado Pago…");
        window.setTimeout(poll, 3000);
      } catch {
        if (!cancelled) window.setTimeout(poll, 4000);
      }
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [status, router, update]);

  return (
    <OnboardingShell step="pronto" sidebarTitle="Pronto!" showBack={false}>
      <div className="space-y-5 text-center">
        <div className="onboard-success-badge" aria-hidden>
          <span>{failed ? "!" : "…"}</span>
        </div>
        <h1 className="onboard-title text-2xl sm:text-[1.85rem]">
          {failed ? "Quase lá" : "Finalizando"}
        </h1>
        <p className="onboard-lead mx-auto max-w-md">{message}</p>
        {failed && (
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link href="/app" className="btn-primary">
              Ir para o painel
            </Link>
            <Link href="/app/conta" className="btn-secondary">
              Ver assinatura
            </Link>
          </div>
        )}
        {session?.user?.email && (
          <p className="text-xs text-muted">Conta: {session.user.email}</p>
        )}
      </div>
    </OnboardingShell>
  );
}
