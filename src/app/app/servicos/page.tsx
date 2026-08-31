"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AdminFlashMessage,
  AdminPageIntro,
  EntityImagePicker,
  EntityListCard,
  EntityListImage,
  EntityStatusDot,
} from "@/components/admin/EntityImageField";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { MAX_SERVICE_PHOTO_BYTES } from "@/lib/image-upload";
import {
  centsToBRLMask,
  formatBRL,
  maskBRLFromDigits,
  maskMinutes,
  parseBRLMaskToCents,
} from "@/lib/utils";

type PageOpt = { id: string; title: string };

type ServiceRow = {
  id: string;
  bookingPageId: string;
  pageTitle: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  durationMinutes: number;
  priceCents: number;
  isActive: boolean;
  bookingsCount: number;
};

type FormState = {
  bookingPageId: string;
  title: string;
  description: string;
  imageUrl: string;
  durationMinutes: string;
  priceMasked: string;
};

const emptyForm = (pageId = ""): FormState => ({
  bookingPageId: pageId,
  title: "",
  description: "",
  imageUrl: "",
  durationMinutes: "60",
  priceMasked: centsToBRLMask(15000),
});

export default function ServicesAdminPage() {
  const { confirm } = useConfirm();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [pages, setPages] = useState<PageOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [msgTone, setMsgTone] = useState<"ok" | "err">("ok");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm());
  const [savingEdit, setSavingEdit] = useState(false);

  async function load() {
    const [svcRes, pagesRes] = await Promise.all([
      fetch("/api/services"),
      fetch("/api/pages"),
    ]);
    if (svcRes.ok) setServices(await svcRes.json());
    if (pagesRes.ok) {
      const list = await pagesRes.json();
      const opts: PageOpt[] = (list || []).map(
        (p: { id: string; title: string }) => ({
          id: p.id,
          title: p.title,
        }),
      );
      setPages(opts);
      if (opts.length === 1) {
        setForm((f) =>
          f.bookingPageId ? f : { ...f, bookingPageId: opts[0].id },
        );
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  function flash(text: string, tone: "ok" | "err" = "ok") {
    setMsg(text);
    setMsgTone(tone);
  }

  async function createService(e: React.FormEvent) {
    e.preventDefault();
    const pageId = form.bookingPageId || pages[0]?.id;
    if (!pageId) {
      flash("Crie uma página de agendamento antes", "err");
      return;
    }
    const duration = Math.max(
      5,
      parseInt(form.durationMinutes || "0", 10) || 0,
    );
    if (!form.title.trim() || !duration) return;

    setCreating(true);
    setMsg("");
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingPageId: pageId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        imageUrl: form.imageUrl || null,
        durationMinutes: duration,
        priceCents: parseBRLMaskToCents(form.priceMasked),
        customFields: [],
      }),
    });
    const data = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) {
      flash(data.error || "Erro ao criar", "err");
      return;
    }
    setForm(emptyForm(pageId));
    setShowCreate(false);
    flash("Serviço criado — a imagem aparece na escolha do cliente");
    await load();
  }

  function openEdit(s: ServiceRow) {
    setEditId(s.id);
    setEditForm({
      bookingPageId: s.bookingPageId,
      title: s.title,
      description: s.description || "",
      imageUrl: s.imageUrl || "",
      durationMinutes: String(s.durationMinutes),
      priceMasked: centsToBRLMask(s.priceCents),
    });
    setMsg("");
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    const duration = Math.max(
      5,
      parseInt(editForm.durationMinutes || "0", 10) || 0,
    );
    if (!editForm.title.trim() || !duration) return;

    setSavingEdit(true);
    setMsg("");
    const res = await fetch(`/api/services/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        imageUrl: editForm.imageUrl || null,
        durationMinutes: duration,
        priceCents: parseBRLMaskToCents(editForm.priceMasked),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSavingEdit(false);
    if (!res.ok) {
      flash(data.error || "Não foi possível salvar", "err");
      return;
    }
    setEditId(null);
    flash("Serviço atualizado");
    await load();
  }

  async function toggleActive(s: ServiceRow) {
    await fetch(`/api/services/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !s.isActive }),
    });
    await load();
  }

  async function saveImage(s: ServiceRow, imageUrl: string | null) {
    setMsg("");
    const res = await fetch(`/api/services/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      flash(data.error || "Não foi possível salvar a imagem", "err");
      return;
    }
    flash("Imagem atualizada — aparece quando o cliente escolhe o serviço");
    await load();
  }

  async function removeService(s: ServiceRow) {
    const ok = await confirm({
      title: s.bookingsCount > 0 ? "Desativar serviço?" : "Excluir serviço?",
      description:
        s.bookingsCount > 0
          ? "Este serviço já tem agendamentos. Vamos apenas desativá-lo para não aparecer no link público."
          : "O serviço será removido. Não dá para desfazer.",
      confirmLabel: s.bookingsCount > 0 ? "Desativar" : "Excluir",
      tone: "danger",
    });
    if (!ok) return;
    if (s.bookingsCount > 0) {
      await fetch(`/api/services/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      await load();
      return;
    }
    await fetch(`/api/services/${s.id}`, { method: "DELETE" });
    await load();
  }

  if (loading) return <p className="text-sm text-muted">Carregando…</p>;

  if (pages.length === 0) {
    return (
      <div className="surface space-y-3 p-6">
        <h1 className="font-semibold tracking-tight">Nenhuma agenda ainda</h1>
        <p className="text-sm text-muted">
          Antes de cadastrar serviços, configure os horários e o link público.
        </p>
        <Link href="/app/agendador" className="btn-primary inline-block !text-xs">
          Ir ao Agendador
        </Link>
      </div>
    );
  }

  const multiPage = pages.length > 1;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminPageIntro link={{ href: "/app/agendador", label: "Agendador →" }}>
        Crie e edite o que você oferece. A imagem aparece no link público quando
        o cliente escolhe o serviço.
      </AdminPageIntro>

      {msg && <AdminFlashMessage tone={msgTone}>{msg}</AdminFlashMessage>}

      <div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setForm(emptyForm(pages[0]?.id || ""));
            setShowCreate(true);
          }}
        >
          Novo serviço
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
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-svc-title"
            className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-white p-5 shadow-2xl shadow-black/15 sm:p-6"
          >
            <form onSubmit={(e) => void createService(e)} className="space-y-4">
              <div>
                <h2
                  id="create-svc-title"
                  className="text-lg font-semibold tracking-tight"
                >
                  Novo serviço
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Nome, duração, preço e imagem opcional.
                </p>
              </div>

              <EntityImagePicker
                shape="square"
                fallbackLabel="Foto"
                maxBytes={MAX_SERVICE_PHOTO_BYTES}
                value={form.imageUrl || null}
                onChange={(url) => setForm({ ...form, imageUrl: url || "" })}
                onError={(err) => flash(err, "err")}
              />

              {multiPage && (
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Página</span>
                  <select
                    required
                    className="input-field"
                    value={form.bookingPageId}
                    onChange={(e) =>
                      setForm({ ...form, bookingPageId: e.target.value })
                    }
                  >
                    {pages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="block text-sm">
                <span className="mb-1 block font-medium">Nome</span>
                <input
                  required
                  autoFocus
                  className="input-field"
                  placeholder="Ex.: Corte feminino"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Duração (min)</span>
                  <input
                    required
                    inputMode="numeric"
                    className="input-field"
                    value={form.durationMinutes}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        durationMinutes: maskMinutes(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Preço</span>
                  <input
                    required
                    inputMode="numeric"
                    className="input-field"
                    value={form.priceMasked}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        priceMasked: maskBRLFromDigits(e.target.value),
                      })
                    }
                  />
                </label>
              </div>

              <label className="block text-sm">
                <span className="mb-1 block font-medium">
                  Descrição{" "}
                  <span className="font-normal text-muted">(opcional)</span>
                </span>
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder="O que está incluso"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </label>

              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={creating}
                  onClick={() => setShowCreate(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary"
                >
                  {creating ? "Criando…" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editId && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={() => {
              if (savingEdit) return;
              setEditId(null);
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-svc-title"
            className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-white p-5 shadow-2xl shadow-black/15 sm:p-6"
          >
            <form onSubmit={(e) => void saveEdit(e)} className="space-y-4">
              <div>
                <h2
                  id="edit-svc-title"
                  className="text-lg font-semibold tracking-tight"
                >
                  Editar serviço
                </h2>
              </div>

              <EntityImagePicker
                shape="square"
                fallbackLabel="Foto"
                maxBytes={MAX_SERVICE_PHOTO_BYTES}
                value={editForm.imageUrl || null}
                onChange={(url) =>
                  setEditForm({ ...editForm, imageUrl: url || "" })
                }
                onError={(err) => flash(err, "err")}
              />

              <label className="block text-sm">
                <span className="mb-1 block font-medium">Nome</span>
                <input
                  required
                  className="input-field"
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Duração (min)</span>
                  <input
                    required
                    inputMode="numeric"
                    className="input-field"
                    value={editForm.durationMinutes}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        durationMinutes: maskMinutes(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Preço</span>
                  <input
                    required
                    inputMode="numeric"
                    className="input-field"
                    value={editForm.priceMasked}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        priceMasked: maskBRLFromDigits(e.target.value),
                      })
                    }
                  />
                </label>
              </div>

              <label className="block text-sm">
                <span className="mb-1 block font-medium">Descrição</span>
                <textarea
                  className="input-field"
                  rows={2}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                />
              </label>

              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={savingEdit}
                  onClick={() => setEditId(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="btn-primary"
                >
                  {savingEdit ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {services.length === 0 ? (
        <div className="surface p-6 text-sm text-muted">
          Nenhum serviço cadastrado ainda. Clique em{" "}
          <strong className="text-foreground">Novo serviço</strong> para começar.
        </div>
      ) : (
        <ul className="space-y-3">
          {services.map((s) => (
            <EntityListCard
              key={s.id}
              inactive={!s.isActive}
              image={
                <EntityListImage
                  shape="square"
                  maxBytes={MAX_SERVICE_PHOTO_BYTES}
                  value={s.imageUrl}
                  fallbackLabel={s.title.slice(0, 1).toUpperCase() || "?"}
                  onChange={(url) => void saveImage(s, url)}
                  onError={(err) => flash(err, "err")}
                />
              }
              title={
                <>
                  <EntityStatusDot active={s.isActive} />
                  <span className="font-semibold tracking-tight">{s.title}</span>
                  {!s.isActive && (
                    <span className="text-xs text-muted">inativo</span>
                  )}
                </>
              }
              meta={
                <>
                  {s.durationMinutes} min · {formatBRL(s.priceCents)}
                  {multiPage ? ` · ${s.pageTitle}` : ""}
                </>
              }
              description={s.description}
              actions={
                <>
                  <button
                    type="button"
                    className="btn-secondary !py-1.5 !text-xs"
                    onClick={() => openEdit(s)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn-secondary !py-1.5 !text-xs"
                    onClick={() => void toggleActive(s)}
                  >
                    {s.isActive ? "Desativar" : "Ativar"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary !py-1.5 !text-xs text-danger"
                    onClick={() => void removeService(s)}
                  >
                    {s.bookingsCount > 0 ? "Desativar" : "Excluir"}
                  </button>
                  {s.imageUrl && (
                    <button
                      type="button"
                      className="btn-secondary !py-1.5 !text-xs text-danger"
                      onClick={() => void saveImage(s, null)}
                    >
                      Remover foto
                    </button>
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
