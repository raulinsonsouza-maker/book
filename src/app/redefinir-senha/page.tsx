"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { PasswordInput } from "@/components/ui/PasswordInput";

function RedefinirSenhaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      setValid(false);
      return;
    }
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        setValid(Boolean(d.valid));
        setChecking(false);
      })
      .catch(() => {
        setValid(false);
        setChecking(false);
      });
  }, [token]);

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
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password, confirmPassword }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError((data as { error?: string }).error || "Não foi possível salvar");
      return;
    }
    router.push("/login?reset=1");
    router.refresh();
  }

  return (
    <div className="surface w-full max-w-md p-8">
      <div className="mb-6 flex flex-col items-center gap-4 text-center">
        <BrandLogo href="/" size="lg" showText />
        <Link href="/login" className="text-sm text-muted hover:text-foreground">
          ← Voltar ao login
        </Link>
      </div>
      <p className="eyebrow">Acesso</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Nova senha</h1>
      <p className="mt-1 text-sm text-muted">
        Cadastre uma senha nova para entrar no sistema.
      </p>

      {checking ? (
        <p className="mt-6 text-sm text-muted">Verificando link…</p>
      ) : !valid ? (
        <div className="mt-6 space-y-4">
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
            Link inválido ou expirado. Solicite um novo em Esqueci minha senha.
          </p>
          <Link href="/esqueci-senha" className="btn-primary inline-flex w-full justify-center py-2.5">
            Solicitar novo link
          </Link>
        </div>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Nova senha</span>
            <PasswordInput
              required
              minLength={6}
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
            {loading ? "Salvando…" : "Salvar e ir ao login"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <div className="dot-grid flex min-h-screen items-center justify-center px-4">
      <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
        <RedefinirSenhaForm />
      </Suspense>
    </div>
  );
}
