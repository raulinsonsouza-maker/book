"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    organizationName: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error || "Erro ao cadastrar");
      return;
    }
    const sign = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });
    setLoading(false);
    if (sign?.error) {
      router.push("/login");
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <div className="dot-grid flex min-h-screen items-center justify-center px-4 py-10">
      <div className="surface w-full max-w-md p-8">
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← Voltar
        </Link>
        <p className="eyebrow mt-6">Começar</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Criar conta</h1>
        <p className="mt-1 text-sm text-muted">
          Sua organização já nasce com uma página de exemplo
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {(
            [
              ["name", "Seu nome", "text"],
              ["organizationName", "Nome da organização", "text"],
              ["email", "E-mail", "email"],
              ["password", "Senha (mín. 6)", "password"],
            ] as const
          ).map(([key, label, type]) => (
            <label key={key} className="block text-sm">
              <span className="mb-1.5 block font-medium">{label}</span>
              <input
                type={type}
                required
                minLength={key === "password" ? 6 : undefined}
                value={form[key]}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [key]: e.target.value }))
                }
                className="input-field"
              />
            </label>
          ))}
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading ? "Criando…" : "Criar conta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-foreground underline-offset-2 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
