"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { PasswordInput } from "@/components/ui/PasswordInput";

export default function EsqueciSenhaPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError((data as { error?: string }).error || "Não foi possível enviar");
      return;
    }
    setDone(true);
  }

  return (
    <div className="dot-grid flex min-h-screen items-center justify-center px-4">
      <div className="surface w-full max-w-md p-8">
        <div className="mb-6 flex flex-col items-center gap-4 text-center">
          <BrandLogo href="/" size="lg" showText />
          <Link href="/login" className="text-sm text-muted hover:text-foreground">
            ← Voltar ao login
          </Link>
        </div>
        <p className="eyebrow">Acesso</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Esqueci minha senha
        </h1>
        <p className="mt-1 text-sm text-muted">
          Enviaremos um link para cadastrar uma nova senha.
        </p>

        {done ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Se este e-mail estiver cadastrado, enviaremos o link em instantes.
              Confira também a caixa de spam.
            </p>
            <button
              type="button"
              className="btn-primary w-full py-2.5"
              onClick={() => router.push("/login")}
            >
              Ir para o login
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">E-mail</span>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
              />
            </label>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5"
            >
              {loading ? "Enviando…" : "Enviar link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
