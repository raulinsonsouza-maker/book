"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";

export default function CompleteGoogleSignupPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [organizationName, setOrganizationName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const hasOrg = Boolean(session?.user?.organizationId);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status === "authenticated" && hasOrg && !loading) {
      router.replace("/app");
    }
  }, [status, hasOrg, loading, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || done) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/complete-google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationName }),
    });
    const data = await res.json();

    if (!res.ok) {
      setLoading(false);
      setError(data.error || "Erro ao concluir cadastro");
      return;
    }

    setDone(true);
    await update();
    router.replace("/onboarding");
  }

  if (status === "loading" || done || (status === "authenticated" && hasOrg)) {
    return (
      <div className="dot-grid flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-muted">
          {done ? "Abrindo configuração inicial…" : "Carregando…"}
        </p>
      </div>
    );
  }

  return (
    <div className="dot-grid flex min-h-screen items-center justify-center px-4 py-10">
      <div className="surface w-full max-w-md p-8">
        <div className="mb-6 flex justify-center">
          <BrandLogo size="lg" showText />
        </div>
        <p className="eyebrow">Quase lá</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Sua empresa
        </h1>
        <p className="mt-1 text-sm text-muted">
          Olá{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}!
          Informe o nome da empresa. Em seguida um assistente configura agenda,
          equipe e pagamentos.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Nome da empresa</span>
            <input
              type="text"
              required
              minLength={2}
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              className="input-field"
              placeholder="Ex.: Clínica Silva"
              disabled={loading}
              autoFocus
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5"
          >
            {loading ? "Criando…" : "Continuar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  );
}
