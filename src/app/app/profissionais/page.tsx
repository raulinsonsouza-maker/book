"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WeekHoursSimple } from "@/components/availability/WeekHoursSimple";
import {
  AdminFlashMessage,
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
  commissionEnabled: boolean;
  commissionPercent: number;
};

type ServiceOpt = { id: string; title: string };

function isPlaceholderEmail(email: string) {
  return email.toLowerCase().endsWith("@book.local");
}

function defaultWeekdayHours() {
  return [1, 2, 3, 4, 5].map((dayOfWeek) => ({
    dayOfWeek,
    startTime: "09:00",
    endTime: "18:00",
  }));
}

function CommissionToggleRow({
  enabled,
  percent,
  onEnabledChange,
  onPercentChange,
}: {
  enabled: boolean;
  percent: number;
  onEnabledChange: (v: boolean) => void;
  onPercentChange: (v: number) => void;
}) {
  return (
    <div className="admin-commission-row">
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Comissão ativa"
          onClick={() => onEnabledChange(!enabled)}
          className={`relative h-6 w-10 shrink-0 rounded-full transition ${
            enabled ? "bg-foreground" : "bg-border"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
              enabled ? "left-[1.125rem]" : "left-0.5"
            }`}
          />
        </button>
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight">Comissão</p>
        </div>
      </div>
      {enabled && (
        <label className="admin-commission-percent">
          <input
            inputMode="numeric"
            className="input-field !w-16 text-center tabular-nums"
            value={String(percent)}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
              const n = Math.min(100, Math.max(0, parseInt(digits || "0", 10)));
              onPercentChange(n);
            }}
            aria-label="Percentual de comissão"
          />
          <span>%</span>
        </label>
      )}
    </div>
  );
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
    commissionEnabled: false,
    commissionPercent: 50,
    hours: defaultWeekdayHours(),
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
    commissionEnabled: false,
    commissionPercent: 50,
  });
  const [editHoursRules, setEditHoursRules] = useState<
    { dayOfWeek: number; startTime: string; endTime: string }[]
  >([]);
  const [editHoursLoading, setEditHoursLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [loginProId, setLoginProId] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [savingLogin, setSavingLogin] = useState(false);

  async function load() {
    const [pRes, svcRes, orgRes] = await Promise.all([
      fetch("/api/professionals"),
      fetch("/api/services"),
      fetch("/api/organization"),
    ]);
    if (orgRes.ok) {
      const org = await orgRes.json();
      setSalonMode(org.businessMode === "SALON");
    }
    if (pRes.ok) setPros(await pRes.json());
    if (svcRes.ok) {
      const list = await svcRes.json();
      setServices(
        (list || [])
          .filter((s: { isActive: boolean }) => s.isActive)
          .map((s: { id: string; title: string }) => ({
            id: s.id,
            title: s.title,
          })),
      );
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
      commissionEnabled: false,
      commissionPercent: 50,
      hours: defaultWeekdayHours(),
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
        commissionEnabled: form.commissionEnabled,
        commissionPercent: form.commissionPercent,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setCreating(false);
      flash(data.error || "Erro ao criar", "err");
      return;
    }
    if (data.id && form.hours.length > 0) {
      await fetch("/api/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalId: data.id,
          rules: form.hours,
        }),
      });
    }
    setCreating(false);
    resetForm();
    flash("Profissional cadastrado — e-mail de acesso enviado");
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
    await load();
  }

  async function openEdit(p: Pro) {
    setEditProId(p.id);
    setEditForm({
      displayName: p.displayName,
      photoUrl: p.photoUrl || "",
      serviceIds: [...p.serviceIds],
      commissionEnabled: Boolean(p.commissionEnabled),
      commissionPercent: p.commissionPercent ?? 50,
    });
    setEditHoursRules([]);
    setEditHoursLoading(true);
    setMsg("");
    const res = await fetch(`/api/professionals/${p.id}`);
    if (res.ok) {
      const data = await res.json();
      setEditHoursRules(data.availability || []);
    }
    setEditHoursLoading(false);
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
        commissionEnabled: editForm.commissionEnabled,
        commissionPercent: editForm.commissionPercent,
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
      <div className="mx-auto max-w-lg">
        <div className="surface space-y-4 p-6 sm:p-8">
          <div className="space-y-1.5">
            <h1 className="text-lg font-semibold tracking-tight">
              Cadastro de profissionais
            </h1>
            <p className="text-sm leading-relaxed text-muted">
              Esta conta está no modo individual. Ative o{" "}
              <strong className="font-medium text-foreground">modo equipe</strong>{" "}
              em Conta para cadastrar profissionais, vincular serviços e definir
              a agenda de cada um.
            </p>
          </div>
          <Link href="/app/conta" className="btn-primary inline-flex">
            Ativar modo equipe
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">
            Profissionais
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted">
            Cadastre quem atende, vincule aos serviços e defina a agenda de
            cada um — é ela que libera os horários no link público.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowCreate(true)}
          >
            Cadastrar profissional
          </button>
        </div>
      </div>

      {msg && <AdminFlashMessage tone={msgTone}>{msg}</AdminFlashMessage>}

      {showCreate && (
        <div className="admin-dialog-backdrop">
          <button
            type="button"
            aria-label="Fechar"
            className="admin-dialog-scrim"
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
            className="admin-dialog"
          >
            <form onSubmit={createPro} className="admin-dialog-form">
              <header className="admin-dialog-header">
                <div>
                  <p className="admin-dialog-kicker">Equipe</p>
                  <h2 id="create-pro-title" className="admin-dialog-title">
                    Novo profissional
                  </h2>
                  <p className="admin-dialog-sub">Nome, foto e login</p>
                </div>
                <button
                  type="button"
                  className="admin-dialog-close"
                  disabled={creating}
                  aria-label="Fechar"
                  onClick={() => {
                    setShowCreate(false);
                    resetForm();
                  }}
                >
                  ✕
                </button>
              </header>

              <div className="admin-dialog-body">
                <section className="admin-dialog-section admin-dialog-section--identity">
                  <EntityImagePicker
                    layout="profile"
                    shape="round"
                    fallbackLabel={
                      form.displayName.slice(0, 2).toUpperCase() || "?"
                    }
                    value={form.photoUrl || null}
                    onChange={(url) =>
                      setForm({ ...form, photoUrl: url || "" })
                    }
                    onError={(err) => flash(err, "err")}
                    hint=""
                  />
                  <label className="admin-field">
                    <span className="admin-field-label">Nome</span>
                    <input
                      required
                      autoFocus
                      className="input-field"
                      placeholder="Ex.: Ana Silva"
                      value={form.displayName}
                      onChange={(e) =>
                        setForm({ ...form, displayName: e.target.value })
                      }
                    />
                  </label>
                </section>

                <section className="admin-dialog-section">
                  <div className="admin-dialog-section-head">
                    <h3>Acesso</h3>
                    <p>Login do profissional no app</p>
                  </div>
                  <div className="admin-dialog-grid">
                    <label className="admin-field">
                      <span className="admin-field-label">E-mail</span>
                      <input
                        required
                        type="email"
                        className="input-field"
                        placeholder="ana@empresa.com"
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span className="admin-field-label">Senha inicial</span>
                      <PasswordInput
                        required
                        minLength={6}
                        className="input-field"
                        placeholder="Mínimo 6 caracteres"
                        value={form.password}
                        onChange={(e) =>
                          setForm({ ...form, password: e.target.value })
                        }
                      />
                    </label>
                  </div>
                </section>

                <section className="admin-dialog-section">
                  <div className="admin-dialog-section-head">
                    <h3>Financeiro</h3>
                    <p>Comissão sobre os serviços atendidos</p>
                  </div>
                  <CommissionToggleRow
                    enabled={form.commissionEnabled}
                    percent={form.commissionPercent}
                    onEnabledChange={(v) =>
                      setForm({ ...form, commissionEnabled: v })
                    }
                    onPercentChange={(v) =>
                      setForm({ ...form, commissionPercent: v })
                    }
                  />
                </section>

                <section className="admin-dialog-section">
                  <div className="admin-dialog-section-head">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <h3>Serviços que atende</h3>
                        <p>
                          No agendamento, este profissional só aparece nestes
                          serviços
                        </p>
                      </div>
                      {services.length > 0 && (
                        <button
                          type="button"
                          className="admin-dialog-text-btn"
                          onClick={() =>
                            setForm({
                              ...form,
                              serviceIds:
                                form.serviceIds.length === services.length
                                  ? []
                                  : services.map((s) => s.id),
                            })
                          }
                        >
                          {form.serviceIds.length === services.length
                            ? "Limpar"
                            : "Selecionar todos"}
                        </button>
                      )}
                    </div>
                  </div>

                  {services.length > 0 ? (
                    <>
                      <div className="admin-chip-grid">
                        {services.map((s) => {
                          const on = form.serviceIds.includes(s.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              aria-pressed={on}
                              onClick={() =>
                                setForm({
                                  ...form,
                                  serviceIds: on
                                    ? form.serviceIds.filter((id) => id !== s.id)
                                    : [...form.serviceIds, s.id],
                                })
                              }
                              className={`admin-chip ${on ? "admin-chip--on" : ""}`}
                            >
                              <span className="admin-chip-check" aria-hidden>
                                {on ? "✓" : ""}
                              </span>
                              {s.title}
                            </button>
                          );
                        })}
                      </div>
                      {form.serviceIds.length === 0 && (
                        <p className="admin-dialog-note">
                          Sem serviço vinculado, o profissional não entra no
                          funil de agendamento.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="admin-dialog-note">
                      Cadastre serviços em{" "}
                      <Link href="/app/servicos">Serviços</Link> e vincule
                      aqui para liberar no agendamento.
                    </p>
                  )}
                </section>

                <section className="admin-dialog-section">
                  <div className="admin-dialog-section-head">
                    <h3>Horários</h3>
                    <p>Quando este profissional atende</p>
                  </div>
                  <WeekHoursSimple
                    deferred
                    initialRules={form.hours}
                    onChange={(hours) =>
                      setForm((prev) => ({ ...prev, hours }))
                    }
                  />
                </section>
              </div>

              <footer className="admin-dialog-footer">
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
                  {creating ? "Cadastrando…" : "Cadastrar profissional"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {editProId && (
        <div className="admin-dialog-backdrop">
          <button
            type="button"
            aria-label="Fechar"
            className="admin-dialog-scrim"
            onClick={() => {
              if (savingEdit) return;
              setEditProId(null);
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-pro-title"
            className="admin-dialog"
          >
            <form
              onSubmit={(e) => void saveEdit(e)}
              className="admin-dialog-form"
            >
              <header className="admin-dialog-header">
                <div>
                  <p className="admin-dialog-kicker">Equipe</p>
                  <h2 id="edit-pro-title" className="admin-dialog-title">
                    Editar profissional
                  </h2>
                  <p className="admin-dialog-sub">Nome, foto e serviços</p>
                </div>
                <button
                  type="button"
                  className="admin-dialog-close"
                  disabled={savingEdit}
                  aria-label="Fechar"
                  onClick={() => setEditProId(null)}
                >
                  ✕
                </button>
              </header>

              <div className="admin-dialog-body">
                <section className="admin-dialog-section admin-dialog-section--identity">
                  <EntityImagePicker
                    layout="profile"
                    shape="round"
                    fallbackLabel={
                      editForm.displayName.slice(0, 2).toUpperCase() || "?"
                    }
                    value={editForm.photoUrl || null}
                    onChange={(url) =>
                      setEditForm({ ...editForm, photoUrl: url || "" })
                    }
                    onError={(err) => flash(err, "err")}
                    hint=""
                  />
                  <label className="admin-field">
                    <span className="admin-field-label">Nome</span>
                    <input
                      required
                      minLength={2}
                      autoFocus
                      className="input-field"
                      value={editForm.displayName}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          displayName: e.target.value,
                        })
                      }
                    />
                  </label>
                </section>

                {services.length > 0 && (
                  <section className="admin-dialog-section">
                    <div className="admin-dialog-section-head">
                      <div className="flex flex-wrap items-end justify-between gap-2">
                        <div>
                          <h3>Serviços que atende</h3>
                          <p>
                            No agendamento, este profissional só aparece nestes
                            serviços
                          </p>
                        </div>
                        <button
                          type="button"
                          className="admin-dialog-text-btn"
                          onClick={() =>
                            setEditForm({
                              ...editForm,
                              serviceIds:
                                editForm.serviceIds.length === services.length
                                  ? []
                                  : services.map((s) => s.id),
                            })
                          }
                        >
                          {editForm.serviceIds.length === services.length
                            ? "Limpar"
                            : "Selecionar todos"}
                        </button>
                      </div>
                    </div>
                    <div className="admin-chip-grid">
                      {services.map((s) => {
                        const on = editForm.serviceIds.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() =>
                              setEditForm({
                                ...editForm,
                                serviceIds: on
                                  ? editForm.serviceIds.filter(
                                      (id) => id !== s.id,
                                    )
                                  : [...editForm.serviceIds, s.id],
                              })
                            }
                            className={`admin-chip ${on ? "admin-chip--on" : ""}`}
                          >
                            <span className="admin-chip-check" aria-hidden>
                              {on ? "✓" : ""}
                            </span>
                            {s.title}
                          </button>
                        );
                      })}
                    </div>
                    {editForm.serviceIds.length === 0 && (
                      <p className="admin-dialog-note">
                        Sem serviço vinculado, o profissional não entra no funil
                        de agendamento.
                      </p>
                    )}
                  </section>
                )}

                <section className="admin-dialog-section">
                  <div className="admin-dialog-section-head">
                    <h3>Financeiro</h3>
                    <p>Comissão sobre os serviços atendidos</p>
                  </div>
                  <CommissionToggleRow
                    enabled={editForm.commissionEnabled}
                    percent={editForm.commissionPercent}
                    onEnabledChange={(v) =>
                      setEditForm({ ...editForm, commissionEnabled: v })
                    }
                    onPercentChange={(v) =>
                      setEditForm({ ...editForm, commissionPercent: v })
                    }
                  />
                </section>

                <section className="admin-dialog-section">
                  <div className="admin-dialog-section-head">
                    <h3>Horários</h3>
                    <p>Quando este profissional atende</p>
                  </div>
                  {editHoursLoading ? (
                    <p className="text-sm text-muted">Carregando horários…</p>
                  ) : editProId ? (
                    <WeekHoursSimple
                      key={editProId}
                      professionalId={editProId}
                      initialRules={editHoursRules}
                      onSaved={setEditHoursRules}
                    />
                  ) : null}
                </section>
              </div>

              <footer className="admin-dialog-footer">
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
              </footer>
            </form>
          </div>
        </div>
      )}

      {pros.length === 0 ? (
        <div className="surface overflow-hidden">
          <div className="flex flex-col items-start gap-4 px-5 py-8 sm:px-8 sm:py-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted-bg text-lg font-bold text-muted">
              +
            </div>
            <div className="space-y-1.5">
              <h2 className="text-base font-semibold tracking-tight">
                Nenhum profissional ainda
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-muted">
                Cadastre a equipe para o cliente escolher quem atende e ver
                horários por pessoa. Depois você define login, serviços e
                agenda.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setShowCreate(true)}
            >
              Cadastrar primeiro profissional
            </button>
          </div>
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
                  {p.serviceIds.length > 0
                    ? ` · ${p.serviceIds.length} serviço${p.serviceIds.length === 1 ? "" : "s"}`
                    : " · sem serviços"}
                  {p.commissionEnabled
                    ? ` · comissão ${p.commissionPercent}%`
                    : ""}
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
