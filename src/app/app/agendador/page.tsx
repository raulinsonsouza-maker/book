"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { AgendadorWelcomeEditor } from "@/components/admin/AgendadorWelcomeEditor";
import {
  readEntityImageFile,
  MAX_SERVICE_PHOTO_BYTES,
  MAX_COVER_BYTES,
} from "@/lib/image-upload";
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

const PRESET_WEEKDAYS: Rule[] = [1, 2, 3, 4, 5].flatMap((dayOfWeek) => [
  { dayOfWeek, startTime: "09:00", endTime: "12:00" },
  { dayOfWeek, startTime: "13:00", endTime: "18:00" },
]);

const DAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function summarizeHours(rules: Rule[]): string {
  const open = [0, 1, 2, 3, 4, 5, 6].filter((d) =>
    rules.some((r) => r.dayOfWeek === d),
  );
  if (open.length === 0) return "Nenhum dia aberto";

  const consecutive =
    open.length > 1 && open.every((d, i) => i === 0 || d === open[i - 1]! + 1);
  const days = consecutive
    ? `${DAY_SHORT[open[0]!]}–${DAY_SHORT[open[open.length - 1]!]}`
    : open.map((d) => DAY_SHORT[d]).join(", ");

  const windows = open.flatMap((d) =>
    rules
      .filter((r) => r.dayOfWeek === d)
      .map((r) => `${r.startTime}–${r.endTime}`),
  );
  const uniqueWindows = [...new Set(windows)];
  if (uniqueWindows.length <= 2 && open.length >= 2) {
    const sampleDay = open[0]!;
    const sample = rules
      .filter((r) => r.dayOfWeek === sampleDay)
      .map((r) => `${r.startTime}–${r.endTime}`)
      .join(", ");
    return `${days} · ${sample}`;
  }
  return days;
}

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
  const [hoursOpen, setHoursOpen] = useState(true);
  const pageMetaAutosaveSkip = useRef(true);
  const pageRef = useRef<PageData | null>(null);
  const serviceSaveTimers = useRef<Record<string, number>>({});
  const hoursInitForPage = useRef<string | null>(null);

  pageRef.current = page;

  useEffect(() => {
    pageMetaAutosaveSkip.current = true;
  }, [page?.id]);

  useEffect(() => {
    if (!page) return;
    if (hoursInitForPage.current === page.id) return;
    hoursInitForPage.current = page.id;
    // Já configurado: começa fechado para não ocupar a tela
    setHoursOpen((page.availability || []).length === 0);
  }, [page]);

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
    };

    pageMetaAutosaveSkip.current = true;
    const res = await fetch(`/api/pages/${snapshot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: sent.title,
        description: sent.description,
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
    // Capa salva em endpoint próprio — não inclui coverImageUrl aqui
  }, [page?.title, page?.description, page?.id]);

  async function uploadCoverFile(file: File | null) {
    const snapshot = pageRef.current;
    if (!file || !snapshot) return;

    readEntityImageFile(
      file,
      async (dataUrl) => {
        // prévia imediata
        setPage((p) => {
          if (!p) return p;
          const next = { ...p, coverImageUrl: dataUrl };
          pageRef.current = next;
          return next;
        });
        setMsg("");

        try {
          const blob = await (await fetch(dataUrl)).blob();
          const form = new FormData();
          form.append(
            "file",
            new File([blob], "cover.jpg", { type: blob.type || "image/jpeg" }),
          );
          const res = await fetch(`/api/pages/${snapshot.id}/cover`, {
            method: "POST",
            body: form,
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            setMsg(
              (data as { error?: string }).error ||
                "Não foi possível salvar a foto",
            );
            return;
          }
          const url = (data as { coverImageUrl?: string }).coverImageUrl || null;
          setPage((p) => {
            if (!p || p.id !== snapshot.id) return p;
            const next = { ...p, coverImageUrl: url };
            pageRef.current = next;
            return next;
          });
        } catch {
          setMsg("Falha de rede ao salvar a foto");
        }
      },
      (err) => {
        setMsg(
          err === "Imagem muito grande"
            ? "Imagem muito grande — use até 2 MB"
            : err,
        );
      },
      MAX_COVER_BYTES,
    );
  }

  function handleCoverFile(file: File | null) {
    void uploadCoverFile(file);
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
      body: JSON.stringify({
        bookingPageId: page.id,
        rules: PRESET_WEEKDAYS,
      }),
    });
    if (!res.ok) return;
    setPage((p) => (p ? { ...p, availability: PRESET_WEEKDAYS } : p));
  }

  function scrollToSection(id: string) {
    if (id === "agendador-horarios") setHoursOpen(true);
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (loading) {
    return <p className="text-sm text-muted">Carregando…</p>;
  }

  if (list.length === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <div className="surface space-y-4 p-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Agendador</h1>
            <p className="mt-1 text-sm text-muted">
              Em poucos minutos seus clientes já podem marcar horário pelo link.
            </p>
          </div>
          <ol className="space-y-2 text-sm text-muted">
            <li className="flex gap-2">
              <span className="font-semibold text-foreground">1.</span>
              Dê um nome à agenda
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-foreground">2.</span>
              Cadastre os serviços
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-foreground">3.</span>
              Defina quando você atende
            </li>
          </ol>
          <form onSubmit={(e) => void createPage(e)} className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Nome da agenda</span>
              <input
                required
                placeholder="Ex.: Atendimento, Consultório, Unidade Centro"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                className="input-field"
              />
            </label>
            <button
              type="submit"
              disabled={creating}
              className="btn-primary w-full sm:w-auto"
            >
              {creating ? "Criando…" : "Criar e continuar"}
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

  const setupSteps = [
    {
      id: "servicos" as const,
      label: "Serviços",
      done: checklist.services,
      target: "agendador-servicos",
    },
    {
      id: "horarios" as const,
      label: "Horários",
      done: checklist.hours,
      target: "agendador-horarios",
    },
    {
      id: "aparencia" as const,
      label: "Aparência",
      done: checklist.name,
      target: "agendador-aparencia",
    },
    {
      id: "link" as const,
      label: "Link",
      done: ready,
      target: "agendador-link",
    },
  ];
  const currentStepId =
    setupSteps.find((s) => !s.done)?.id ?? ("link" as const);

  const nextAction = !checklist.services
    ? {
        text: "Próximo passo: cadastre pelo menos um serviço.",
        cta: "Ir para Serviços",
        href: "/app/servicos" as string | null,
        target: null as string | null,
      }
    : !checklist.hours
      ? {
          text: "Próximo passo: defina e salve quando você atende.",
          cta: "Ver horários",
          href: null,
          target: "agendador-horarios",
        }
      : !checklist.name
        ? {
            text: "Próximo passo: informe o nome da agenda na prévia.",
            cta: "Editar aparência",
            href: null,
            target: "agendador-aparencia",
          }
        : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Agendador</h1>
          <p className="mt-1 text-sm text-muted">
            Configure o link que seus clientes usam para marcar horário.
          </p>
        </div>
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

      <nav
        className="agendador-setup-progress"
        aria-label="Progresso da configuração"
      >
        {setupSteps.map((step, index) => {
          const isCurrent = step.id === currentStepId;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => scrollToSection(step.target)}
              className={`agendador-setup-step ${
                step.done ? "agendador-setup-step-done" : ""
              } ${isCurrent ? "agendador-setup-step-current" : ""}`}
            >
              <span className="agendador-setup-step-num" aria-hidden>
                {step.done ? "✓" : index + 1}
              </span>
              <span>{step.label}</span>
            </button>
          );
        })}
      </nav>

      <section id="agendador-link" className="scroll-mt-20">
        {ready ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm font-semibold text-emerald-900">
              Pronto para compartilhar
            </p>
            <p className="mt-1 break-all text-xs text-emerald-800/80">
              {publicUrl}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <CopyLinkButton url={publicUrl} />
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary !text-sm"
              >
                Abrir link
              </a>
            </div>
          </div>
        ) : nextAction ? (
          <div className="surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">{nextAction.text}</p>
            {nextAction.href ? (
              <Link href={nextAction.href} className="btn-primary shrink-0 !text-sm">
                {nextAction.cta}
              </Link>
            ) : (
              <button
                type="button"
                className="btn-primary shrink-0 !text-sm"
                onClick={() =>
                  nextAction.target && scrollToSection(nextAction.target)
                }
              >
                {nextAction.cta}
              </button>
            )}
          </div>
        ) : null}
      </section>

      <section
        id="agendador-servicos"
        className="surface scroll-mt-20 space-y-3 p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              Passo 1
            </p>
            <h2 className="mt-0.5 text-sm font-semibold tracking-tight">
              Serviços
            </h2>
            <p className="mt-1 text-xs text-muted">
              O que o cliente pode agendar (corte, consulta, etc.).
            </p>
          </div>
          {checklist.services && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
              Pronto
            </span>
          )}
        </div>

        {!checklist.services ? (
          <div className="rounded-xl border border-dashed border-border bg-muted-bg/40 p-5 text-center">
            <p className="text-sm font-medium">Ainda não há serviços ativos</p>
            <p className="mt-1 text-xs text-muted">
              Cadastre o primeiro serviço para o cliente ver opções no link.
            </p>
            <Link
              href="/app/servicos"
              className="btn-primary mt-4 inline-flex !text-sm"
            >
              Cadastre o primeiro serviço
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              <span className="font-semibold">{activeServices}</span>{" "}
              {activeServices === 1 ? "serviço ativo" : "serviços ativos"}
              <span className="text-muted">
                {" "}
                · você também pode editar nome e preço na prévia abaixo
              </span>
            </p>
            <Link
              href="/app/servicos"
              className="btn-secondary shrink-0 !text-sm"
            >
              Gerenciar em Serviços
            </Link>
          </div>
        )}
      </section>

      <section
        id="agendador-horarios"
        className="surface scroll-mt-20 space-y-4 p-6"
      >
        <button
          type="button"
          className="flex w-full flex-wrap items-start justify-between gap-2 text-left"
          aria-expanded={hoursOpen}
          onClick={() => setHoursOpen((o) => !o)}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              Passo 2
            </p>
            <h2 className="mt-0.5 flex items-center gap-2 text-sm font-semibold tracking-tight">
              Quando você atende?
              <span
                className={`inline-block text-muted transition-transform ${hoursOpen ? "rotate-180" : ""}`}
                aria-hidden
              >
                ▾
              </span>
            </h2>
            {hoursOpen ? (
              <p className="mt-1 text-xs text-muted">
                Sem horários salvos, o cliente não vê vagas no link.
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted">
                {checklist.hours
                  ? summarizeHours(page.availability || [])
                  : "Toque para definir os horários"}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {checklist.hours && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                Pronto
              </span>
            )}
            <span className="text-xs font-medium text-muted">
              {hoursOpen ? "Fechar" : "Abrir"}
            </span>
          </div>
        </button>

        {hoursOpen && (
          <>
            {(page.availability || []).length === 0 && (
              <div className="rounded-xl border border-dashed border-border bg-muted-bg/40 p-4">
                <p className="text-sm font-medium">Começar mais rápido</p>
                <p className="mt-1 text-xs text-muted">
                  Modelo seg–sex, 9h–12h e 13h–18h. Você pode ajustar depois.
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
          </>
        )}
      </section>

      <div id="agendador-aparencia" className="scroll-mt-20 space-y-2">
        <div className="px-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
            Passo 3
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Personalize o que o cliente vê ao abrir o link.
          </p>
        </div>
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
          onRemoveCover={() => {
            const snapshot = pageRef.current;
            setPage((p) => {
              if (!p) return p;
              const next = { ...p, coverImageUrl: null };
              pageRef.current = next;
              return next;
            });
            if (!snapshot) return;
            void fetch(`/api/pages/${snapshot.id}/cover`, { method: "DELETE" })
              .then(async (r) => {
                if (!r.ok) {
                  const data = await r.json().catch(() => ({}));
                  setMsg(
                    (data as { error?: string }).error ||
                      "Não foi possível remover a foto",
                  );
                }
              })
              .catch(() => setMsg("Falha de rede ao remover a foto"));
          }}
          onServiceChange={handleServiceChange}
          onServiceImageFile={handleServiceImageFile}
          onSaveAll={saveAllPageChanges}
        />
      </div>
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
