"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { AuthDivider, GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { PasswordInput } from "@/components/ui/PasswordInput";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const justCreated = searchParams.get("created") === "1";

  useEffect(() => {
    fetch("/api/auth/google-enabled")
      .then((r) => r.json())
      .then((d) => setGoogleEnabled(Boolean(d.enabled)))
      .catch(() => setGoogleEnabled(false));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("E-mail ou senha inválidos");
      return;
    }
    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    router.push(session?.user?.isPlatformAdmin ? "/gerencial" : "/app");
    router.refresh();
  }

  return (
    <div className="surface w-full max-w-md p-8">
      <div className="mb-6 flex flex-col items-center gap-4 text-center">
        <BrandLogo href="/" size="lg" showText />
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← Voltar
        </Link>
      </div>
      <p className="eyebrow">Acesso</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Entrar</h1>
      <p className="mt-1 text-sm text-muted">Acesse o painel da sua empresa</p>

      {justCreated && (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Conta criada. Entre com o e-mail e a senha cadastrados.
        </p>
      )}

      {googleEnabled && (
        <>
          <div className="mt-6">
            <GoogleSignInButton enabled />
          </div>
          <AuthDivider />
        </>
      )}

      <form
        onSubmit={onSubmit}
        className={`space-y-4 ${googleEnabled ? "" : "mt-6"}`}
      >
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">E-mail</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Senha</span>
          <PasswordInput
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
          />
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Não tem conta?{" "}
        <Link
          href="/signup"
          className="font-medium text-foreground underline-offset-2 hover:underline"
        >
          Criar agora
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="dot-grid flex min-h-screen items-center justify-center px-4">
      <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
