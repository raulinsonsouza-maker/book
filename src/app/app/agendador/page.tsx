"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { AgendadorWelcomeEditor } from "@/components/admin/AgendadorWelcomeEditor";
import { readEntityImageFile, MAX_SERVICE_PHOTO_BYTES } from "@/lib/image-upload";
import { DeletePageButton } from "@/components/admin/DeletePageButton";
import { WeekHoursSimple } from "@/components/availability/WeekHoursSimple";
import { bookingPublicPath, bookingPublicUrl } from "@/lib/booking-page-slug";

type Rule = { dayOfWeek: number; startTime: string; endTime: string };

type PageListItem = {
  id: string;
  title: string;
  slug: string;
  isActive: boolean;
  _count: { services: number; bookings: number };
};

type PageData = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  isActive: boolean;
  services: {
    id: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    durationMinutes: number;
    priceCents: number;
    isActive: boolean;
  }[];
  availability: Rule[];
  _count?: { bookings: number };
};

const MAX_COVER_BYTES = 2 * 1024 * 1024;

function readCoverFile(
  file: File | null,
  onOk: (dataUrl: string) => void,
  onError: (msg: string) => void,
) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    onError("Envie uma imagem (PNG, JPG ou WebP)");
    return;
  }
  if (file.size > MAX_COVER_BYTES) {
    onError("Imagem muito grande — use até 2 MB");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => onOk(String(reader.result || ""));
  reader.readAsDataURL(file);
}

const PRESET_WEEKDAYS: Rule[] = [1, 2, 3, 4, 5].flatMap((dayOfWeek) => [
  { dayOfWeek, startTime: "09:00", endTime: "12:00" },
  { dayOfWeek, startTime: "13:00", endTime: "18:00" },
]);

function AgendadorInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageIdParam = searchParams.get("id");

  const [list, setList] = useState<PageListItem[]>([]);
  const [page, setPage] = useState<PageData | null>(null);
  const [orgSlug, setOrgSlug] = useState("");
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);
  const [orgAccent, setOrgAccent] = useState("#0a0a0a");
  const [businessMode, setBusinessMode] = useState<"SOLO" | "SALON">("SOLO");
  const [demoPayments, setDemoPayments] = useState(true);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createError, setCreateError] = useState("");
  const [msg, setMsg] = useState("");
  const pageMetaAutosaveSkip = useRef(true);
  const pageRef = useRef<PageData | null>(null);
  const serviceSaveTimers = useRef<Record<string, number>>({});

  pageRef.current = page;

  useEffect(() => {
    pageMetaAutosaveSkip.current = true;
  }, [page?.id]);

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "";

  async function loadList() {
    const [pagesRes, orgRes] = await Promise.all([
      fetch("/api/pages"),
      fetch("/api/organization"),
    ]);
    const pages = (await pagesRes.json()) as PageListItem[];
    const org = await orgRes.json();
    setOrgSlug(org.slug || "");
    setOrgLogoUrl(org.logoUrl || null);
    setOrgAccent(org.accentColor || "#0a0a0a");
    setBusinessMode(org.businessMode === "SALON" ? "SALON" : "SOLO");
    setDemoPayments(
      !(org.caktoConnected || org.mercadoPagoConnected || org.asaasConnected),
    );
    const safe = Array.isArray(pages) ? pages : [];
    setList(safe);
    return { pages: safe, orgSlug: (org.slug as string) || "" };
  }

  async function loadPage(id: string) {
    const res = await fetch(`/api/pages/${id}`);
    if (!res.ok) {
      setPage(null);
      return;
    }
    setPage((await res.json()) as PageData);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { pages } = await loadList();
      if (cancelled) return;

      if (pages.length === 0) {
        setLoading(false);
        return;
      }

      const targetId =
        pageIdParam && pages.some((p) => p.id === pageIdParam)
          ? pageIdParam
          : pages.length === 1
            ? pages[0].id
            : pageIdParam && pages.some((p) => p.id === pageIdParam)
              ? pageIdParam
              : null;

      if (pages.length > 1 && !targetId) {
        setLoading(false);
        return;
      }

      if (targetId) {
        if (!pageIdParam && pages.length === 1) {
          router.replace(`/app/agendador?id=${targetId}`);
        }
        await loadPage(targetId);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIdParam]);

  const checklist = useMemo(() => {
    if (!page) return { name: false, services: false, hours: false };
    return {
      name: page.title.trim().length >= 2,
      services: page.services.some((s) => s.isActive),
      hours: (page.availability || []).length > 0,
    };
  }, [page]);

  const ready = checklist.name && checklist.services && checklist.hours;

  async function createPage(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    const res = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: createTitle }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setCreateError(data.error || "Não foi possível criar");
      return;
    }
    router.replace(`/app/agendador?id=${data.id}`);
  }

  function flushServiceSaveTimers() {
    for (const id of Object.keys(serviceSaveTimers.current)) {
      window.clearTimeout(serviceSaveTimers.current[id]);
      delete serviceSaveTimers.current[id];
    }
  }

  async function savePageMetaNow(): Promise<{ ok: boolean; error?: string }> {
    const snapshot = pageRef.current;
    if (!snapshot) {
      return { ok: false, error: "Página não carregada" };
    }

    const sent = {
      title: snapshot.title,
      description: snapshot.description,
      coverImageUrl: snapshot.coverImageUrl,
    };

    pageMetaAutosaveSkip.current = true;
    const res = await fetch(`/api/pages/${snapshot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: sent.title,
        description: sent.description,
        coverImageUrl: sent.coverImageUrl,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error:
          (data as { error?: string }).error ||
          "Não foi possível salvar a página",
      };
    }
    const updated = data as Pick<
      PageData,
      "title" | "slug" | "description" | "coverImageUrl"
    >;
    setPage((p) => {
      if (!p || p.id !== snapshot.id) return p;
      return {
        ...p,
        slug: updated.slug,
        title: p.title === sent.title ? updated.title : p.title,
        description:
          p.description === sent.description
            ? updated.description
            : p.description,
        coverImageUrl:
          p.coverImageUrl === sent.coverImageUrl
            ? (updated.coverImageUrl ?? null)
            : p.coverImageUrl,
      };
    });
    return { ok: true };
  }

  async function saveServiceNow(
    id: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const p = pageRef.current;
    const service = p?.services.find((s) => s.id === id);
    if (!p || !service) return { ok: true };

    const sent = {
      title: service.title,
      description: service.description,
      imageUrl: service.imageUrl,
      durationMinutes: service.durationMinutes,
      priceCents: service.priceCents,
    };

    const res = await fetch(`/api/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sent),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error:
          (data as { error?: string }).error ||
          `Não foi possível salvar “${service.title}”`,
      };
    }
    const updated = data as PageData["services"][number];
    setPage((current) =>
      current
        ? {
            ...current,
            services: current.services.map((s) => {
              if (s.id !== id) return s;
              if (
                s.title !== sent.title ||
                s.description !== sent.description ||
                s.imageUrl !== sent.imageUrl ||
                s.durationMinutes !== sent.durationMinutes ||
                s.priceCents !== sent.priceCents
              ) {
                return s;
              }
              return {
                ...s,
                title: updated.title,
                description: updated.description,
                imageUrl: updated.imageUrl,
                durationMinutes: updated.durationMinutes,
                priceCents: updated.priceCents,
                isActive: updated.isActive,
              };
            }),
          }
        : current,
    );
    return { ok: true };
  }

  async function saveAllPageChanges(): Promise<{ ok: boolean; error?: string }> {
    flushServiceSaveTimers();
    const meta = await savePageMetaNow();
    if (!meta.ok) return meta;

    const services = pageRef.current?.services ?? [];
    for (const service of services) {
      const result = await saveServiceNow(service.id);
      if (!result.ok) return result;
    }
    return { ok: true };
  }

  async function saveMetaSilent() {
    const result = await savePageMetaNow();
    if (!result.ok) {
      setMsg(result.error || "Não foi possível salvar");
    }
  }

  useEffect(() => {
    if (!page) return;
    if (pageMetaAutosaveSkip.current) {
      pageMetaAutosaveSkip.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void saveMetaSilent();
    }, 500);
    return () => window.clearTimeout(timer);
  }, [page?.title, page?.description, page?.coverImageUrl, page?.id]);

  function handleCoverFile(file: File | null) {
    readCoverFile(
      file,
      (dataUrl) => {
        setPage((p) => (p ? { ...p, coverImageUrl: dataUrl } : p));
        setMsg("");
      },
      (err) => {
        setMsg(err);
      },
    );
  }

  function scheduleServiceSave(id: string) {
    const existing = serviceSaveTimers.current[id];
    if (existing) window.clearTimeout(existing);
    serviceSaveTimers.current[id] = window.setTimeout(() => {
      void saveServiceSilent(id);
    }, 500);
  }

  async function saveServiceSilent(id: string) {
    const result = await saveServiceNow(id);
    if (!result.ok) {
      setMsg(result.error || "Não foi possível salvar o serviço");
    }
  }

  function handleServiceChange(
    id: string,
    patch: Partial<PageData["services"][number]>,
  ) {
    setPage((p) =>
      p
        ? {
            ...p,
            services: p.services.map((s) =>
              s.id === id ? { ...s, ...patch } : s,
            ),
          }
        : p,
    );
    scheduleServiceSave(id);
  }

  function handleServiceImageFile(id: string, file: File | null) {
    readEntityImageFile(
      file,
      (dataUrl) => {
        handleServiceChange(id, { imageUrl: dataUrl });
        setMsg("");
      },
      (err) => setMsg(err),
      MAX_SERVICE_PHOTO_BYTES,
    );
  }

  const activeServices = page?.services.filter((s) => s.isActive).length ?? 0;

  async function applyHoursPreset() {
    if (!page) return;
    const res = await fetch("/api/availability", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId: page.id, rules: PRESET_WEEKDAYS }),
    });
    if (!res.ok) return;
    setPage((p) => (p ? { ...p, availability: PRESET_WEEKDAYS } : p));
  }

  if (loading) {
    return <p className="text-sm text-muted">Carregando…</p>;
  }

  if (list.length === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <div className="surface space-y-3 p-6">
          <h1 className="text-xl font-semibold tracking-tight">Agendador</h1>
          <p className="text-sm text-muted">
            Crie o link que seus clientes usam para marcar horário. Depois
            cadastre os serviços e defina quando você atende.
          </p>
          <form onSubmit={(e) => void createPage(e)} className="space-y-3">
            <input
              required
              placeholder="Nome (ex.: Atendimento)"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              className="input-field"
            />
            <button
              type="submit"
              disabled={creating}
              className="btn-primary w-full sm:w-auto"
            >
              {creating ? "Criando…" : "Criar agendador"}
            </button>
          </form>
          {createError && <p className="text-sm text-danger">{createError}</p>}
        </div>
      </div>
    );
  }

  if (list.length > 1 && !page) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Agendador</h1>
          <p className="mt-1 text-sm text-muted">
            Escolha qual link de agendamento configurar. Serviços ficam em{" "}
            <Link
              href="/app/servicos"
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              Serviços
            </Link>
            .
          </p>
        </div>
        <ul className="space-y-3">
          {list.map((p) => {
            const path = orgSlug
              ? bookingPublicPath(orgSlug, p.slug)
              : `/p/${p.slug}`;
            return (
              <li
                key={p.id}
                className="surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h2 className="font-semibold tracking-tight">{p.title}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {p._count.services} serviços · {p._count.bookings}{" "}
                    agendamentos
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.isActive && (
                    <CopyLinkButton url={`${appUrl}${path}`} />
                  )}
                  <Link
                    href={`/app/agendador?id=${p.id}`}
                    className="btn-primary !py-1.5 !text-xs"
                  >
                    Abrir
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
        <form
          onSubmit={(e) => void createPage(e)}
          className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
        >
          <input
            required
            placeholder="Nova agenda (ex.: Unidade Centro)"
            value={createTitle}
            onChange={(e) => setCreateTitle(e.target.value)}
            className="input-field flex-1"
          />
          <button
            type="submit"
            disabled={creating}
            className="btn-primary whitespace-nowrap"
          >
            {creating ? "Criando…" : "Criar agenda"}
          </button>
        </form>
        {createError && (
          <p className="text-sm text-danger">{createError}</p>
        )}
      </div>
    );
  }

  if (!page) {
    return <p className="text-sm text-muted">Carregando…</p>;
  }

  const publicUrl = orgSlug
    ? bookingPublicUrl(orgSlug, page.slug)
    : `${appUrl}/p/${page.slug}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-muted">
          Link público, horários e personalização do funil de agendamento.
          Serviços em{" "}
          <Link
            href="/app/servicos"
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            Serviços
          </Link>
          .
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {list.length > 1 && (
            <Link
              href="/app/agendador"
              className="shrink-0 text-sm font-medium text-muted underline-offset-2 hover:text-foreground hover:underline"
              onClick={(e) => {
                e.preventDefault();
                setPage(null);
                router.push("/app/agendador");
              }}
            >
              ← Todas as agendas
            </Link>
          )}
          <DeletePageButton
            pageId={page.id}
            pageTitle={page.title}
            bookingsCount={page._count?.bookings ?? 0}
            isActive={page.isActive}
            redirectTo="/app/agendador"
          />
        </div>
      </div>

      {msg && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-danger">
          {msg}
        </p>
      )}

      {!ready && (
        <section className="surface space-y-2 p-6">
          <p className="text-sm font-semibold tracking-tight">Para liberar o link</p>
          <ul className="space-y-2 text-sm text-muted">
            {!checklist.services && (
              <li>
                · Cadastre um serviço em{" "}
                <Link
                  href="/app/servicos"
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                >
                  Serviços
                </Link>
              </li>
            )}
            {!checklist.hours && (
              <li>· Defina e salve os horários abaixo</li>
            )}
            {!checklist.name && <li>· Informe um nome para a agenda</li>}
          </ul>
        </section>
      )}

      <AgendadorWelcomeEditor
        pageId={page.id}
        title={page.title}
        description={page.description || ""}
        coverImageUrl={page.coverImageUrl}
        orgLogoUrl={orgLogoUrl}
        orgAccent={orgAccent}
        publicUrl={publicUrl}
        services={page.services.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          imageUrl: s.imageUrl,
          durationMinutes: s.durationMinutes,
          priceCents: s.priceCents,
          isActive: s.isActive,
        }))}
        businessMode={businessMode}
        demoPayments={demoPayments}
        onTitleChange={(value) =>
          setPage((p) => (p ? { ...p, title: value } : p))
        }
        onDescriptionChange={(value) =>
          setPage((p) => (p ? { ...p, description: value } : p))
        }
        onCoverFile={handleCoverFile}
        onRemoveCover={() =>
          setPage((p) => (p ? { ...p, coverImageUrl: null } : p))
        }
        onServiceChange={handleServiceChange}
        onServiceImageFile={handleServiceImageFile}
        onSaveAll={saveAllPageChanges}
      />

      <section className="surface space-y-4 p-6">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Quando você atende?</h2>
          <p className="mt-1 text-xs text-muted">
            Sem horários salvos, o cliente não vê vagas.
          </p>
        </div>

        {(page.availability || []).length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-muted-bg/40 p-4">
            <p className="text-sm font-medium">Começar mais rápido</p>
            <p className="mt-1 text-xs text-muted">
              Modelo seg–sex, 9h–12h e 13h–18h.
            </p>
            <button
              type="button"
              onClick={() => void applyHoursPreset()}
              className="btn-secondary mt-3 !text-xs"
            >
              Usar horário comercial
            </button>
          </div>
        )}

        <WeekHoursSimple
          pageId={page.id}
          initialRules={page.availability || []}
          onSaved={(rules) =>
            setPage((p) => (p ? { ...p, availability: rules } : p))
          }
        />

        <p className="text-xs text-muted">
          Feriados e exceções?{" "}
          <Link
            href={`/app/agendador/${page.id}/availability`}
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            Opções avançadas
          </Link>
        </p>
      </section>
    </div>
  );
}

export default function AgendadorPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
      <AgendadorInner />
    </Suspense>
  );
}
