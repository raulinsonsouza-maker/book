"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    router.push("/app");
    router.refresh();
  }

  return (
    <div className="dot-grid flex min-h-screen items-center justify-center px-4">
      <div className="surface w-full max-w-md p-8">
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← Voltar
        </Link>
        <p className="eyebrow mt-6">Acesso</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Entrar</h1>
        <p className="mt-1 text-sm text-muted">
          Acesse o painel da sua organização
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
            <input
              type="password"
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
          <Link href="/signup" className="font-medium text-foreground underline-offset-2 hover:underline">
            Criar agora
          </Link>
        </p>
      </div>
    </div>
  );
}
