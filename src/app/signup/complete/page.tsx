"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function CompleteGoogleSignupPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [organizationName, setOrganizationName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status === "authenticated" && session?.user?.organizationId) {
      router.replace("/app");
    }
  }, [status, session, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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

    await update();
    router.push("/app");
    router.refresh();
  }

  if (status === "loading") {
    return (
      <div className="dot-grid flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-muted">Carregando…</p>
      </div>
    );
  }

  return (
    <div className="dot-grid flex min-h-screen items-center justify-center px-4 py-10">
      <div className="surface w-full max-w-md p-8">
        <p className="eyebrow">Quase lá</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Sua empresa
        </h1>
        <p className="mt-1 text-sm text-muted">
          Olá{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}!
          Escolha um nome para sua empresa. Criamos uma página de exemplo
          automaticamente.
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
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading ? "Criando…" : "Continuar para o painel"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/login" className="font-medium text-foreground underline-offset-2 hover:underline">
            Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  );
}
