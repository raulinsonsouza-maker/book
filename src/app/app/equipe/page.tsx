"use client";

import { useEffect, useState } from "react";
import {
  AdminFlashMessage,
  AdminPageIntro,
  EntityListCard,
  EntityStatusDot,
} from "@/components/admin/EntityImageField";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { PasswordInput } from "@/components/ui/PasswordInput";

type TeamMember = {
  id: string;
  role: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
};

export default function EquipeAdminPage() {
  const { confirm } = useConfirm();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [msgTone, setMsgTone] = useState<"ok" | "err">("ok");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [loginMemberId, setLoginMemberId] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [savingLogin, setSavingLogin] = useState(false);

  async function load() {
    const res = await fetch("/api/team");
    if (res.ok) setMembers(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function flash(text: string, tone: "ok" | "err" = "ok") {
    setMsg(text);
    setMsgTone(tone);
  }

  function resetForm() {
    setForm({ name: "", email: "", password: "" });
  }

  async function createMember(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMsg("");
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      flash(data.error || "Erro ao criar", "err");
      return;
    }
    resetForm();
    flash("Membro da equipe criado");
    setShowCreate(false);
    await load();
  }

  async function toggleActive(m: TeamMember) {
    await fetch(`/api/team/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !m.isActive }),
    });
    await load();
  }

  function openLogin(m: TeamMember) {
    setLoginMemberId(m.id);
    setLoginEmail(m.email);
    setLoginPassword("");
    setMsg("");
  }

  async function saveLogin(m: TeamMember) {
    setSavingLogin(true);
    setMsg("");
    const payload: { email?: string; password?: string } = {};
    const email = loginEmail.trim().toLowerCase();
    if (email && email !== m.email.toLowerCase()) payload.email = email;
    if (loginPassword.trim().length >= 6) payload.password = loginPassword.trim();

    if (!payload.email && !payload.password) {
      setSavingLogin(false);
      flash("Informe um novo e-mail ou uma nova senha", "err");
      return;
    }

    const res = await fetch(`/api/team/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setSavingLogin(false);
    if (!res.ok) {
      flash(data.error || "Não foi possível salvar o login", "err");
      return;
    }
    setLoginMemberId(null);
    setLoginPassword("");
    flash(`Login de ${m.name} atualizado`);
    await load();
  }

  async function removeMember(m: TeamMember) {
    const ok = await confirm({
      title: m.isActive ? "Excluir membro?" : "Remover membro inativo?",
      description: "Isso remove o acesso à plataforma para este usuário.",
      confirmLabel: "Excluir",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/team/${m.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      flash(data.error || "Erro ao excluir", "err");
      return;
    }
    flash("Membro removido");
    await load();
  }

  if (loading) return <p className="text-sm text-muted">Carregando…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminPageIntro>
        Convide pessoas da sua equipe para acessar o painel. Membros da equipe
        veem apenas os dossiês de <strong>Intake</strong> (ex.: abertura de
        empresa) — ideal para escritórios e contadores parceiros.
      </AdminPageIntro>

      {msg && <AdminFlashMessage tone={msgTone}>{msg}</AdminFlashMessage>}

      <div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setShowCreate(true)}
        >
          Adicionar membro
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={() => {
              if (creating) return;
              setShowCreate(false);
              resetForm();
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-member-title"
            className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-white p-5 shadow-2xl shadow-black/15 sm:p-6"
          >
            <form onSubmit={createMember} className="space-y-4">
              <div>
                <h2
                  id="create-member-title"
                  className="text-lg font-semibold tracking-tight"
                >
                  Novo membro da equipe
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Nome, e-mail e senha para acesso ao Intake.
                </p>
              </div>

              <label className="block text-sm">
                <span className="mb-1 block font-medium">Nome</span>
                <input
                  required
                  className="input-field"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex.: Venx Legalização"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium">E-mail</span>
                <input
                  required
                  type="email"
                  className="input-field"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="contato@escritorio.com"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium">Senha</span>
                <PasswordInput
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="Mínimo 6 caracteres"
                />
              </label>

              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={creating}
                  onClick={() => {
                    setShowCreate(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" disabled={creating} className="btn-primary">
                  {creating ? "Criando…" : "Criar membro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {members.length === 0 ? (
        <div className="surface p-6 text-sm text-muted">
          Nenhum membro cadastrado. Clique em{" "}
          <strong className="text-foreground">Adicionar membro</strong> para dar
          acesso ao Intake.
        </div>
      ) : (
        <ul className="space-y-3">
          {members.map((m) => (
            <EntityListCard
              key={m.id}
              inactive={!m.isActive}
              image={
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted-bg text-xs font-semibold text-muted">
                  {m.name.slice(0, 2).toUpperCase()}
                </span>
              }
              title={
                <>
                  <EntityStatusDot active={m.isActive} />
                  <span className="font-semibold tracking-tight">{m.name}</span>
                  {!m.isActive && (
                    <span className="text-xs text-muted">inativo</span>
                  )}
                </>
              }
              meta={
                <>
                  {m.email} · acesso Intake
                </>
              }
              actions={
                <>
                  <button
                    type="button"
                    className="btn-secondary !py-1.5 !text-xs"
                    onClick={() => openLogin(m)}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    className="btn-secondary !py-1.5 !text-xs"
                    onClick={() => toggleActive(m)}
                  >
                    {m.isActive ? "Desativar" : "Reativar"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary !py-1.5 !text-xs text-danger"
                    onClick={() => removeMember(m)}
                  >
                    Excluir
                  </button>
                </>
              }
              footer={
                loginMemberId === m.id ? (
                  <div className="space-y-3 border-t border-border pt-4">
                    <p className="text-sm font-medium">Login de {m.name}</p>
                    <p className="text-xs text-muted">
                      O membro usa este e-mail e senha em Entrar.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-sm">
                        <span className="mb-1 block font-medium">E-mail</span>
                        <input
                          type="email"
                          className="input-field"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block font-medium">Nova senha</span>
                        <PasswordInput
                          minLength={6}
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="Deixe em branco para manter"
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-primary !py-1.5 !text-xs"
                        disabled={savingLogin}
                        onClick={() => saveLogin(m)}
                      >
                        {savingLogin ? "Salvando…" : "Salvar login"}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary !py-1.5 !text-xs"
                        onClick={() => setLoginMemberId(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : undefined
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}
