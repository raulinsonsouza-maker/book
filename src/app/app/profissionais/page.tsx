"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WeekHoursSimple } from "@/components/availability/WeekHoursSimple";
import {
  AdminFlashMessage,
  AdminPageIntro,
  EntityImagePicker,
  EntityListCard,
  EntityListImage,
  EntityStatusDot,
} from "@/components/admin/EntityImageField";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { PasswordInput } from "@/components/ui/PasswordInput";

type Pro = {
  id: string;
  displayName: string;
  photoUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  email: string;
  serviceIds: string[];
  bookingsCount: number;
};

type ServiceOpt = { id: string; title: string; bookingPageId: string };

function isPlaceholderEmail(email: string) {
  return email.toLowerCase().endsWith("@book.local");
}

export default function ProfessionalsAdminPage() {
  const { confirm } = useConfirm();
  const [pros, setPros] = useState<Pro[]>([]);
  const [services, setServices] = useState<ServiceOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [salonMode, setSalonMode] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgTone, setMsgTone] = useState<"ok" | "err">("ok");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
    photoUrl: "" as string,
    serviceIds: [] as string[],
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [editHours, setEditHours] = useState<
    { dayOfWeek: number; startTime: string; endTime: string }[]
  >([]);
  const [editProId, setEditProId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    displayName: "",
    photoUrl: "" as string,
    serviceIds: [] as string[],
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [loginProId, setLoginProId] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [savingLogin, setSavingLogin] = useState(false);

  async function load() {
    const [pRes, pagesRes, orgRes] = await Promise.all([
      fetch("/api/professionals"),
      fetch("/api/pages"),
      fetch("/api/organization"),
    ]);
    if (orgRes.ok) {
      const org = await orgRes.json();
      setSalonMode(org.businessMode === "SALON");
    }
    if (pRes.ok) setPros(await pRes.json());
    if (pagesRes.ok) {
      const pages = await pagesRes.json();
      const multiPage = pages.length > 1;
      const svc: ServiceOpt[] = [];
      for (const page of pages) {
        const detail = await fetch(`/api/pages/${page.id}`);
        if (!detail.ok) continue;
        const d = await detail.json();
        for (const s of d.services || []) {
          if (s.isActive) {
            svc.push({
              id: s.id,
              title: multiPage ? `${s.title} (${page.title})` : s.title,
              bookingPageId: page.id,
            });
          }
        }
      }
      setServices(svc);
    }
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
    setForm({
      displayName: "",
      email: "",
      password: "",
      photoUrl: "",
      serviceIds: [],
    });
  }

  async function createPro(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMsg("");
    const res = await fetch("/api/professionals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: form.displayName,
        email: form.email,
        password: form.password,
        serviceIds: form.serviceIds,
        photoUrl: form.photoUrl || null,
      }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      flash(data.error || "Erro ao criar", "err");
      return;
    }
    resetForm();
    flash("Profissional criado");
    setShowCreate(false);
    await load();
  }

  async function toggleActive(p: Pro) {
    await fetch(`/api/professionals/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    await load();
  }

  async function saveServices(p: Pro, serviceIds: string[]) {
    await fetch(`/api/professionals/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceIds }),
    });
    await load();
  }

  async function savePhoto(p: Pro, photoUrl: string | null) {
    setMsg("");
    const res = await fetch(`/api/professionals/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoUrl }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      flash(data.error || "Não foi possível salvar a foto", "err");
      return;
    }
    flash("Foto atualizada — aparece quando o cliente escolhe o profissional");
    await load();
  }

  function openEdit(p: Pro) {
    setEditProId(p.id);
    setEditForm({
      displayName: p.displayName,
      photoUrl: p.photoUrl || "",
      serviceIds: [...p.serviceIds],
    });
    setMsg("");
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editProId) return;
    setSavingEdit(true);
    setMsg("");
    const res = await fetch(`/api/professionals/${editProId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: editForm.displayName.trim(),
        photoUrl: editForm.photoUrl || null,
        serviceIds: editForm.serviceIds,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSavingEdit(false);
    if (!res.ok) {
      flash(data.error || "Não foi possível salvar", "err");
      return;
    }
    setEditProId(null);
    flash("Profissional atualizado");
    await load();
  }

  function openLogin(p: Pro) {
    setLoginProId(p.id);
    setLoginEmail(isPlaceholderEmail(p.email) ? "" : p.email);
    setLoginPassword("");
    setMsg("");
  }

  async function saveLogin(p: Pro) {
    setSavingLogin(true);
    setMsg("");
    const payload: { email?: string; password?: string } = {};
    const email = loginEmail.trim().toLowerCase();
    if (email && email !== p.email.toLowerCase()) payload.email = email;
    if (loginPassword.trim().length >= 6) payload.password = loginPassword.trim();

    if (!payload.email && !payload.password) {
      setSavingLogin(false);
      flash(
        isPlaceholderEmail(p.email)
          ? "Informe o e-mail de login e uma senha"
          : "Informe um novo e-mail ou uma nova senha",
        "err",
      );
      return;
    }
    if (isPlaceholderEmail(p.email) && !payload.email) {
      setSavingLogin(false);
      flash("Defina um e-mail real para o login (não use o temporário)", "err");
      return;
    }
    if (isPlaceholderEmail(p.email) && !payload.password) {
      setSavingLogin(false);
      flash("Defina uma senha para este profissional", "err");
      return;
    }

    const res = await fetch(`/api/professionals/${p.id}`, {
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
    setLoginProId(null);
    setLoginPassword("");
    flash(`Login de ${p.displayName} atualizado`);
    await load();
  }

  async function openHours(p: Pro) {
    const res = await fetch(`/api/professionals/${p.id}`);
    const data = await res.json();
    setEditId(p.id);
    setEditHours(data.availability || []);
  }

  async function removePro(p: Pro) {
    const ok = await confirm({
      title: p.bookingsCount > 0 ? "Desativar profissional?" : "Excluir profissional?",
      description:
        p.bookingsCount > 0
          ? "Há agendamentos no histórico. A conta será desativada."
          : "Isso remove o login e o cadastro.",
      confirmLabel: p.bookingsCount > 0 ? "Desativar" : "Excluir",
      tone: "danger",
    });
    if (!ok) return;
    await fetch(`/api/professionals/${p.id}`, { method: "DELETE" });
    await load();
  }

  if (loading) return <p className="text-sm text-muted">Carregando…</p>;

  if (!salonMode) {
    return (
      <div className="surface space-y-3 p-6">
        <h1 className="font-semibold tracking-tight">Modo Individual ativo</h1>
        <p className="text-sm text-muted">
          Para cadastrar profissionais, ative o{" "}
          <strong>modo equipe</strong> em Conta.
        </p>
        <Link href="/app/conta" className="btn-primary inline-block !text-xs">
          Ir para Conta
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminPageIntro link={{ href: "/app/servicos", label: "Serviços →" }}>
        Cadastre a equipe, edite cada profissional, vincule aos serviços e
        defina a agenda. A foto aparece no link público quando o cliente
        escolhe quem atende. Use <strong>Login</strong> para e-mail e senha de
        acesso.
      </AdminPageIntro>

      {msg && <AdminFlashMessage tone={msgTone}>{msg}</AdminFlashMessage>}

      <div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setShowCreate(true)}
        >
          Criar profissional
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
            aria-labelledby="create-pro-title"
            className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-white p-5 shadow-2xl shadow-black/15 sm:p-6"
          >
            <form onSubmit={createPro} className="space-y-4">
              <div>
                <h2
                  id="create-pro-title"
                  className="text-lg font-semibold tracking-tight"
                >
                  Novo profissional
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Nome, login, foto e serviços que atende.
                </p>
              </div>

              <EntityImagePicker
                shape="round"
                fallbackLabel={
                  form.displayName.slice(0, 2).toUpperCase() || "Foto"
                }
                value={form.photoUrl || null}
                onChange={(url) => setForm({ ...form, photoUrl: url || "" })}
                onError={(err) => flash(err, "err")}
                hint="Aparece na escolha do profissional · PNG, JPG ou WebP"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Nome</span>
                  <input
                    required
                    autoFocus
                    className="input-field"
                    value={form.displayName}
                    onChange={(e) =>
                      setForm({ ...form, displayName: e.target.value })
                    }
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">E-mail (login)</span>
                  <input
                    required
                    type="email"
                    className="input-field"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1 block font-medium">Senha inicial</span>
                  <PasswordInput
                    required
                    minLength={6}
                    className="input-field"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                  />
                </label>
              </div>

              {services.length > 0 && (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">
                    Serviços que atende
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {services.map((s) => {
                      const on = form.serviceIds.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              serviceIds: on
                                ? form.serviceIds.filter((id) => id !== s.id)
                                : [...form.serviceIds, s.id],
                            })
                          }
                          className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
                            on
                              ? "bg-foreground text-white ring-foreground"
                              : "bg-white text-muted ring-border"
                          }`}
                        >
                          {s.title}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              )}

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
                  {creating ? "Criando…" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editProId && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={() => {
              if (savingEdit) return;
              setEditProId(null);
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-pro-title"
            className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-white p-5 shadow-2xl shadow-black/15 sm:p-6"
          >
            <form onSubmit={(e) => void saveEdit(e)} className="space-y-4">
              <div>
                <h2
                  id="edit-pro-title"
                  className="text-lg font-semibold tracking-tight"
                >
                  Editar profissional
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Nome, foto e serviços. Login e horários ficam nos botões da
                  lista.
                </p>
              </div>

              <EntityImagePicker
                shape="round"
                fallbackLabel={
                  editForm.displayName.slice(0, 2).toUpperCase() || "Foto"
                }
                value={editForm.photoUrl || null}
                onChange={(url) =>
                  setEditForm({ ...editForm, photoUrl: url || "" })
                }
                onError={(err) => flash(err, "err")}
                hint="Aparece na escolha do profissional · PNG, JPG ou WebP"
              />

              <label className="block text-sm">
                <span className="mb-1 block font-medium">Nome</span>
                <input
                  required
                  minLength={2}
                  autoFocus
                  className="input-field"
                  value={editForm.displayName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, displayName: e.target.value })
                  }
                />
              </label>

              {services.length > 0 && (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">
                    Serviços que atende
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {services.map((s) => {
                      const on = editForm.serviceIds.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() =>
                            setEditForm({
                              ...editForm,
                              serviceIds: on
                                ? editForm.serviceIds.filter((id) => id !== s.id)
                                : [...editForm.serviceIds, s.id],
                            })
                          }
                          className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
                            on
                              ? "bg-foreground text-white ring-foreground"
                              : "bg-white text-muted ring-border"
                          }`}
                        >
                          {s.title}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={savingEdit}
                  onClick={() => setEditProId(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="btn-primary"
                >
                  {savingEdit ? "Salvando…" : "Salvar alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pros.length === 0 ? (
        <div className="surface p-6 text-sm text-muted">
          Nenhum profissional cadastrado ainda. Clique em{" "}
          <strong className="text-foreground">Criar profissional</strong> para
          começar.
        </div>
      ) : (
        <ul className="space-y-3">
          {pros.map((p) => (
            <EntityListCard
              key={p.id}
              inactive={!p.isActive}
              image={
                <EntityListImage
                  shape="round"
                  value={p.photoUrl}
                  fallbackLabel={p.displayName.slice(0, 2).toUpperCase()}
                  onChange={(url) => void savePhoto(p, url)}
                  onError={(err) => flash(err, "err")}
                />
              }
              title={
                <>
                  <EntityStatusDot active={p.isActive} />
                  <span className="font-semibold tracking-tight">
                    {p.displayName}
                  </span>
                  {!p.isActive && (
                    <span className="text-xs text-muted">inativo</span>
                  )}
                </>
              }
              meta={
                <>
                  {isPlaceholderEmail(p.email)
                    ? "Login ainda não definido"
                    : p.email}{" "}
                  · {p.bookingsCount} agendamentos
                </>
              }
              actions={
                <>
                  <button
                    type="button"
                    className="btn-primary !py-1.5 !text-xs"
                    onClick={() => openEdit(p)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn-secondary !py-1.5 !text-xs"
                    onClick={() => openLogin(p)}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    className="btn-secondary !py-1.5 !text-xs"
                    onClick={() => openHours(p)}
                  >
                    Horários
                  </button>
                  <button
                    type="button"
                    className="btn-secondary !py-1.5 !text-xs"
                    onClick={() => toggleActive(p)}
                  >
                    {p.isActive ? "Desativar" : "Reativar"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary !py-1.5 !text-xs text-danger"
                    onClick={() => removePro(p)}
                  >
                    Excluir
                  </button>
                </>
              }
              footer={
                <>
                  {services.length > 0 && (
                    <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                      {services.map((s) => {
                        const on = p.serviceIds.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              const next = on
                                ? p.serviceIds.filter((id) => id !== s.id)
                                : [...p.serviceIds, s.id];
                              void saveServices(p, next);
                            }}
                            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${
                              on
                                ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                                : "bg-muted-bg text-muted ring-border"
                            }`}
                          >
                            {s.title}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {loginProId === p.id && (
                    <div className="space-y-3 border-t border-border pt-4">
                      <p className="text-sm font-medium">
                        Login de {p.displayName}
                      </p>
                      <p className="text-xs text-muted">
                        O profissional usa este e-mail e senha em Entrar.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-sm">
                          <span className="mb-1 block font-medium">E-mail</span>
                          <input
                            required={isPlaceholderEmail(p.email)}
                            type="email"
                            className="input-field"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            placeholder="nome@empresa.com"
                          />
                        </label>
                        <label className="block text-sm">
                          <span className="mb-1 block font-medium">
                            {isPlaceholderEmail(p.email) ? "Senha" : "Nova senha"}
                          </span>
                          <PasswordInput
                            minLength={6}
                            className="input-field"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder={
                              isPlaceholderEmail(p.email)
                                ? "Mínimo 6 caracteres"
                                : "Deixe em branco para manter"
                            }
                          />
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={savingLogin}
                          className="btn-primary !py-1.5 !text-xs"
                          onClick={() => void saveLogin(p)}
                        >
                          {savingLogin ? "Salvando…" : "Salvar login"}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary !py-1.5 !text-xs"
                          onClick={() => setLoginProId(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {editId === p.id && (
                    <div className="border-t border-border pt-4">
                      <p className="mb-3 text-sm font-medium">
                        Agenda de {p.displayName}
                      </p>
                      <WeekHoursSimple
                        professionalId={p.id}
                        initialRules={editHours}
                        onSaved={(rules) => setEditHours(rules)}
                      />
                    </div>
                  )}
                </>
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}
