"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { SignOutButton } from "@/components/admin/SignOutButton";

type OrgSummary = {
  name: string;
  businessMode?: "SOLO" | "SALON";
  logoUrl?: string | null;
};

export function PerfilPanel() {
  const { data: session } = useSession();
  const [org, setOrg] = useState<OrgSummary | null>(null);

  useEffect(() => {
    fetch("/api/organization")
      .then((r) => r.json())
      .then((data: OrgSummary) => setOrg(data));
  }, []);

  const userName =
    session?.user?.name?.trim() ||
    session?.user?.email?.split("@")[0] ||
    "";
  const email = session?.user?.email || "";
  const role = session?.user?.role;
  const roleLabel =
    role === "PROFESSIONAL"
      ? "Profissional"
      : org?.businessMode === "SALON"
        ? "Equipe"
        : "Individual";

  return (
    <div className="space-y-5">
      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <p className="settings-card-kicker">Conta</p>
            <h2>Seu perfil</h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className="sidebar-user-avatar !h-14 !w-14 !text-base">
            {(userName || org?.name || "?").trim().slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="text-lg font-semibold tracking-tight text-foreground">
              {userName || "—"}
            </p>
            {email ? <p className="text-sm text-muted">{email}</p> : null}
            <p className="mt-1 text-sm text-muted">
              {org?.name || "…"}
              {roleLabel ? ` · ${roleLabel}` : ""}
            </p>
          </div>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <p className="settings-card-kicker">Segurança</p>
            <h2>Acesso</h2>
          </div>
        </div>
        <p className="settings-card-lead">
          Redefina a senha pelo e-mail cadastrado ou encerre a sessão neste
          dispositivo.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/esqueci-senha" className="btn-secondary">
            Redefinir senha
          </Link>
          <SignOutButton />
        </div>
      </section>
    </div>
  );
}
