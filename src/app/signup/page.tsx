"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { AuthDivider, GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { PasswordInput } from "@/components/ui/PasswordInput";

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
  const [googleEnabled, setGoogleEnabled] = useState(false);

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
      router.push("/login?created=1");
      return;
    }
    router.replace("/onboarding");
  }

  return (
    <div className="dot-grid flex min-h-screen items-center justify-center px-4 py-10">
      <div className="surface w-full max-w-md p-8">
        <div className="mb-6 flex flex-col items-center gap-4 text-center">
          <BrandLogo href="/" size="lg" showText />
          <Link href="/" className="text-sm text-muted hover:text-foreground">
            ← Voltar
          </Link>
        </div>
        <p className="eyebrow">Começar</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Criar conta</h1>
        <p className="mt-1 text-sm text-muted">
          Crie a conta e um assistente configura empresa, agenda e pagamentos
        </p>

        {googleEnabled && (
          <>
            <div className="mt-6">
              <GoogleSignInButton label="Cadastrar com Google" enabled />
            </div>
            <AuthDivider />
          </>
        )}

        <form
          onSubmit={onSubmit}
          className={`space-y-4 ${googleEnabled ? "" : "mt-6"}`}
        >
          {(
            [
              ["name", "Seu nome", "text"],
              ["organizationName", "Nome da empresa", "text"],
              ["email", "E-mail", "email"],
            ] as const
          ).map(([key, label, type]) => (
            <label key={key} className="block text-sm">
              <span className="mb-1.5 block font-medium">{label}</span>
              <input
                type={type}
                required
                value={form[key]}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [key]: e.target.value }))
                }
                className="input-field"
              />
            </label>
          ))}
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Senha (mín. 6)</span>
            <PasswordInput
              required
              minLength={6}
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
              className="input-field"
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <p className="text-xs leading-relaxed text-muted">
            Ao criar a conta, você concorda com os{" "}
            <Link href="/termos" className="underline underline-offset-2">
              Termos de uso
            </Link>{" "}
            e a{" "}
            <Link href="/privacidade" className="underline underline-offset-2">
              Política de privacidade
            </Link>
            .
          </p>
          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading ? "Criando…" : "Criar conta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Já tem conta?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
