"use client";

import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { PasswordInput } from "@/components/ui/PasswordInput";

export default function PrimeiroAcessoPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status === "authenticated" && !session?.user?.mustChangePassword) {
      router.replace(
        session.user.isPlatformAdmin ? "/gerencial" : "/app",
      );
    }
  }, [status, session, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, confirmPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoading(false);
      setError((data as { error?: string }).error || "Não foi possível salvar");
      return;
    }
    try {
      await update();
    } catch {
      /* JWT será atualizado no próximo getSession */
    }
    setLoading(false);
    router.replace(
      session?.user?.isPlatformAdmin ? "/gerencial" : "/app",
    );
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
    <div className="dot-grid flex min-h-screen items-center justify-center px-4">
      <div className="surface w-full max-w-md p-8">
        <div className="mb-6 flex flex-col items-center gap-4 text-center">
          <BrandLogo href="/" size="lg" showText />
        </div>
        <p className="eyebrow">Primeiro acesso</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Cadastre sua senha
        </h1>
        <p className="mt-1 text-sm text-muted">
          Por segurança, defina uma senha nova antes de entrar no painel.
        </p>

        <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Nova senha</span>
            <PasswordInput
              required
              minLength={6}
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              autoComplete="new-password"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Confirmar senha</span>
            <PasswordInput
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field"
              autoComplete="new-password"
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5"
          >
            {loading ? "Salvando…" : "Salvar e acessar"}
          </button>
        </form>

        <button
          type="button"
          className="mt-4 w-full text-center text-sm text-muted underline-offset-2 hover:text-foreground hover:underline"
          onClick={() => void signOut({ callbackUrl: "/login" })}
        >
          Sair
        </button>
      </div>
    </div>
  );
}
