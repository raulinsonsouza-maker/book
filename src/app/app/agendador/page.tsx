"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { AgendadorWelcomeEditor } from "@/components/admin/AgendadorWelcomeEditor";
import { DeletePageButton } from "@/components/admin/DeletePageButton";
import { EntityImagePicker } from "@/components/admin/EntityImageField";
import { WeekHoursSimple } from "@/components/availability/WeekHoursSimple";
import {
  readEntityImageFile,
  MAX_SERVICE_PHOTO_BYTES,
  MAX_COVER_BYTES,
} from "@/lib/image-upload";
import { bookingPublicPath, bookingPublicUrl } from "@/lib/booking-page-slug";
import {
  centsToBRLMask,
  formatBRL,
  maskBRLFromDigits,
  maskMinutes,
  parseBRLMaskToCents,
} from "@/lib/utils";

type Rule = { dayOfWeek: number; startTime: string; endTime: string };

type PageListItem = {
  id: string;
  title: string;
  slug: string;
  isActive: boolean;
  activeServiceCount?: number;
  teamHoursReady?: boolean;
  activeProfessionalCount?: number;
  _count: { bookings: number; availability: number };
};

type CatalogService = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  durationMinutes: number;
  priceCents: number;
  isActive: boolean;
};

type PageData = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  isActive: boolean;
  serviceIds?: string[];
  services: CatalogService[];
  availability: Rule[];
  teamHoursReady?: boolean;
  teamHours?: Rule[];
  teamProfessionals?: {
    id: string;
    displayName: string;
    hoursCount: number;
  }[];
  _count?: { bookings: number };
};

type SectionId = "servicos" | "horarios" | "pagina";

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
  return days;
}

function pageChecklist(
  page: {
    title: string;
    services?: { isActive?: boolean }[];
    availability?: Rule[];
    _count?: { availability?: number; bookings?: number };
    activeServiceHint?: number;
    teamHoursReady?: boolean;
  },
  businessMode: "SOLO" | "SALON" = "SOLO",
) {
  const activeServices =
    page.activeServiceHint ??
    page.services?.filter((s) => s.isActive !== false).length ??
    0;
  const hours =
    businessMode === "SALON"
      ? Boolean(page.teamHoursReady)
      : (page.availability?.length ?? 0) > 0 ||
        (page._count?.availability ?? 0) > 0;
  return {
    name: page.title.trim().length >= 2,
    services: activeServices > 0,
    hours,
  };
}

function setupLabel(c: ReturnType<typeof pageChecklist>) {
  if (c.services && c.hours && c.name) return "Pronto";
  const missing: string[] = [];
  if (!c.services) missing.push("serviços");
  if (!c.hours) missing.push("horários");
  if (!c.name) missing.push("nome");
  return `Falta ${missing.join(", ")}`;
}

function AgendadorInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageIdParam = searchParams.get("id");
  const isNovo = searchParams.get("novo") === "1";

  const [list, setList] = useState<PageListItem[]>([]);
  const [page, setPage] = useState<PageData | null>(null);
  const [orgSlug, setOrgSlug] = useState("");
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);
  const [orgAccent, setOrgAccent] = useState("#0a0a0a");
  const [businessMode, setBusinessMode] = useState<"SOLO" | "SALON">("SOLO");
  const [demoPayments, setDemoPayments] = useState(true);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [openSection, setOpenSection] = useState<SectionId>("servicos");

  // Wizard
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardTitle, setWizardTitle] = useState("");
  const [wizardError, setWizardError] = useState("");
  const [wizardCreating, setWizardCreating] = useState(false);
  const [wizardPageId, setWizardPageId] = useState<string | null>(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [creatingService, setCreatingService] = useState(false);
  const [serviceFormError, setServiceFormError] = useState("");
  const [serviceForm, setServiceForm] = useState({
    title: "",
    description: "",
    imageUrl: "",
    durationMinutes: "60",
    priceMasked: centsToBRLMask(15000),
  });
  const [orgCatalog, setOrgCatalog] = useState<CatalogService[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [savingServices, setSavingServices] = useState(false);

  const pageMetaAutosaveSkip = useRef(true);
  const pageRef = useRef<PageData | null>(null);
  const serviceSaveTimers = useRef<Record<string, number>>({});

  pageRef.current = page;

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "";

  const mode: "list" | "wizard" | "edit" = isNovo
    ? "wizard"
    : pageIdParam
      ? "edit"
      : "list";

  const loadList = useCallback(async () => {
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
  }, []);

  async function loadPage(id: string) {
    const res = await fetch(`/api/pages/${id}`);
    if (!res.ok) {
      setPage(null);
      return null;
    }
    const data = (await res.json()) as PageData;
    setPage(data);
    setSelectedServiceIds(
      data.serviceIds?.length
        ? data.serviceIds
        : data.services.map((s) => s.id),
    );
    return data;
  }

  async function loadOrgCatalog() {
    const res = await fetch("/api/services");
    if (!res.ok) return;
    const list = (await res.json()) as CatalogService[];
    setOrgCatalog(Array.isArray(list) ? list.filter((s) => s.isActive) : []);
  }

  async function savePageServiceIds(
    pageId: string,
    serviceIds: string[],
  ): Promise<{ ok: boolean; error?: string }> {
    if (serviceIds.length === 0) {
      return { ok: false, error: "Selecione ao menos um serviço" };
    }
    setSavingServices(true);
    const res = await fetch(`/api/pages/${pageId}/services`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceIds }),
    });
    const data = await res.json().catch(() => ({}));
    setSavingServices(false);
    if (!res.ok) {
      return {
        ok: false,
        error: (data as { error?: string }).error || "Erro ao salvar serviços",
      };
    }
    await loadPage(pageId);
    await loadList();
    return { ok: true };
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadList();
      if (cancelled) return;

      if (mode === "edit" || mode === "wizard") {
        await loadOrgCatalog();
      }

      if (mode === "edit" && pageIdParam) {
        const data = await loadPage(pageIdParam);
        if (!data || !data.isActive) {
          router.replace("/app/agendador");
        }
      } else if (mode === "wizard") {
        const resumeId = wizardPageId || pageIdParam;
        if (resumeId) {
          setWizardPageId(resumeId);
          const data = await loadPage(resumeId);
          if (!data || !data.isActive) {
            router.replace("/app/agendador?novo=1");
            setWizardPageId(null);
            setWizardStep(0);
          } else if (wizardStep === 0) {
            setWizardStep(1);
          }
        } else {
          setPage(null);
          setWizardStep(0);
          setWizardTitle("");
          setWizardError("");
        }
      } else {
        setPage(null);
      }

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIdParam, isNovo]);

  useEffect(() => {
    pageMetaAutosaveSkip.current = true;
  }, [page?.id]);

  useEffect(() => {
    if (!page || mode !== "edit") return;
    const c = pageChecklist(page, businessMode);
    if (!c.services) setOpenSection("servicos");
    else if (!c.hours) setOpenSection("horarios");
    else setOpenSection("pagina");
  }, [page?.id, mode, businessMode]);

  const checklist = useMemo(
    () => (page ? pageChecklist(page, businessMode) : null),
    [page, businessMode],
  );
  const ready = Boolean(
    checklist?.name && checklist?.services && checklist?.hours,
  );

  async function createWizardPage(e: React.FormEvent) {
    e.preventDefault();
    if (wizardTitle.trim().length < 2) {
      setWizardError("Informe um nome com pelo menos 2 caracteres");
      return;
    }
    setWizardCreating(true);
    setWizardError("");
    const res = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: wizardTitle.trim() }),
    });
    const data = await res.json();
    setWizardCreating(false);
    if (!res.ok) {
      setWizardError(data.error || "Não foi possível criar");
      return;
    }
    setWizardPageId(data.id);
    await loadPage(data.id);
    await loadList();
    setWizardStep(1);
    router.replace(`/app/agendador?novo=1&id=${data.id}`);
  }

  function openServiceModal() {
    setServiceForm({
      title: "",
      description: "",
      imageUrl: "",
      durationMinutes: "60",
      priceMasked: centsToBRLMask(15000),
    });
    setServiceFormError("");
    setShowServiceModal(true);
  }

  async function createWizardService(e: React.FormEvent) {
    e.preventDefault();
    const pageId = wizardPageId || page?.id;
    if (!pageId) return;
    const duration = Math.max(
      5,
      parseInt(serviceForm.durationMinutes || "0", 10) || 0,
    );
    if (!serviceForm.title.trim() || !duration) {
      setServiceFormError("Informe nome e duração");
      return;
    }
    setCreatingService(true);
    setServiceFormError("");
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: serviceForm.title.trim(),
        description: serviceForm.description.trim() || null,
        imageUrl: serviceForm.imageUrl || null,
        durationMinutes: duration,
        priceCents: parseBRLMaskToCents(serviceForm.priceMasked),
        customFields: [],
      }),
    });
    const data = await res.json().catch(() => ({}));
    setCreatingService(false);
    if (!res.ok) {
      setServiceFormError(
        (data as { error?: string }).error || "Erro ao criar serviço",
      );
      return;
    }
    setShowServiceModal(false);
    const nextIds = [...new Set([...selectedServiceIds, data.id as string])];
    setSelectedServiceIds(nextIds);
    await savePageServiceIds(pageId, nextIds);
    await loadOrgCatalog();
  }

  function flushServiceSaveTimers() {
    for (const id of Object.keys(serviceSaveTimers.current)) {
      window.clearTimeout(serviceSaveTimers.current[id]);
      delete serviceSaveTimers.current[id];
    }
  }

  async function savePageMetaNow(): Promise<{ ok: boolean; error?: string }> {
    const snapshot = pageRef.current;
    if (!snapshot) return { ok: false, error: "Página não carregada" };
    const sent = { title: snapshot.title, description: snapshot.description };
    pageMetaAutosaveSkip.current = true;
    const res = await fetch(`/api/pages/${snapshot.id}`, {
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
          "Não foi possível salvar a página",
      };
    }
    const updated = data as Pick<PageData, "title" | "slug" | "description">;
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
    return { ok: true };
  }

  async function saveAllPageChanges(): Promise<{
    ok: boolean;
    error?: string;
  }> {
    flushServiceSaveTimers();
    const meta = await savePageMetaNow();
    if (!meta.ok) return meta;
    const ids = pageRef.current?.services.map((s) => s.id) || [];
    for (const id of ids) {
      const r = await saveServiceNow(id);
      if (!r.ok) return r;
    }
    return { ok: true };
  }

  useEffect(() => {
    if (!page) return;
    if (pageMetaAutosaveSkip.current) {
      pageMetaAutosaveSkip.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      void savePageMetaNow().then((r) => {
        if (!r.ok && r.error) setMsg(r.error);
      });
    }, 500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page?.title, page?.description]);

  function handleServiceChange(
    id: string,
    patch: Partial<PageData["services"][number]>,
  ) {
    setPage((p) => {
      if (!p) return p;
      return {
        ...p,
        services: p.services.map((s) =>
          s.id === id ? { ...s, ...patch } : s,
        ),
      };
    });
    window.clearTimeout(serviceSaveTimers.current[id]);
    serviceSaveTimers.current[id] = window.setTimeout(() => {
      void saveServiceNow(id).then((r) => {
        if (!r.ok && r.error) setMsg(r.error);
      });
    }, 450);
  }

  function handleCoverFile(file: File | null) {
    if (!page) return;
    readEntityImageFile(
      file,
      (dataUrl) => {
        setPage((p) => (p ? { ...p, coverImageUrl: dataUrl } : p));
        const fd = new FormData();
        if (file) fd.append("file", file);
        void fetch(`/api/pages/${page.id}/cover`, {
          method: "POST",
          body: fd,
        }).then(async (r) => {
          if (!r.ok) {
            const data = await r.json().catch(() => ({}));
            setMsg(
              (data as { error?: string }).error ||
                "Não foi possível enviar a capa",
            );
          }
        });
      },
      (err) => setMsg(err),
      MAX_COVER_BYTES,
    );
  }

  function handleServiceImageFile(id: string, file: File | null) {
    readEntityImageFile(
      file,
      (dataUrl) => handleServiceChange(id, { imageUrl: dataUrl }),
      (err) => setMsg(err),
      MAX_SERVICE_PHOTO_BYTES,
    );
  }

  if (loading) {
    return <p className="text-sm text-muted">Carregando…</p>;
  }

  /* ─── LISTA ─── */
  if (mode === "list") {
    return (
      <div className="pages-hub mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-xl text-sm text-muted">
            Cada página é um link de agendamento — útil para unidades ou locais
            diferentes.
          </p>
          <Link href="/app/agendador?novo=1" className="btn-primary shrink-0">
            Novo
          </Link>
        </div>

        {list.length === 0 ? (
          <div className="pages-hub-empty surface p-8 text-center">
            <p className="text-sm font-semibold">Nenhuma página ainda</p>
            <p className="mt-1 text-sm text-muted">
              Crie a primeira para seus clientes marcarem horário.
            </p>
            <Link
              href="/app/agendador?novo=1"
              className="btn-primary mt-4 inline-flex"
            >
              Criar página
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {list.map((p) => {
              const c = pageChecklist(
                {
                  title: p.title,
                  activeServiceHint: p.activeServiceCount ?? 0,
                  teamHoursReady: p.teamHoursReady,
                  _count: p._count,
                },
                businessMode,
              );
              const readyItem = c.services && c.hours && c.name;
              const path = orgSlug
                ? bookingPublicPath(orgSlug, p.slug)
                : `/p/${p.slug}`;
              const url = `${appUrl}${path}`;
              return (
                <li key={p.id} className="pages-hub-card surface p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate font-semibold tracking-tight">
                          {p.title}
                        </h2>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            readyItem
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-800"
                          }`}
                        >
                          {setupLabel(c)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {p.activeServiceCount ?? 0} serviço(s) nesta página ·{" "}
                        {p._count.bookings} agendamento(s)
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary !py-1.5 !text-xs"
                      >
                        Abrir
                      </a>
                      <CopyLinkButton url={url} />
                      <Link
                        href={`/app/agendador?id=${p.id}`}
                        className="btn-primary !py-1.5 !text-xs"
                      >
                        Editar
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  /* ─── WIZARD ─── */
  if (mode === "wizard") {
    const wPage = page;
    const wCheck = wPage ? pageChecklist(wPage, businessMode) : null;
    const isSalon = businessMode === "SALON";
    const publicUrl = wPage
      ? orgSlug
        ? bookingPublicUrl(orgSlug, wPage.slug)
        : `${appUrl}/p/${wPage.slug}`
      : "";

    const steps = ["Nome", "Serviços", "Horários", "Página", "Pronto"];
    const teamProCount = wPage?.teamProfessionals?.length ?? 0;

    return (
      <div className="pages-hub mx-auto max-w-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/app/agendador"
            className="text-sm font-medium text-muted underline-offset-2 hover:text-foreground hover:underline"
          >
            ← Voltar à lista
          </Link>
          <p className="text-xs font-medium text-muted">
            Passo {wizardStep + 1} de {steps.length}
          </p>
        </div>

        <div className="pages-hub-wizard-progress">
          {steps.map((label, i) => (
            <div
              key={label}
              className={`pages-hub-wizard-dot ${
                i < wizardStep
                  ? "is-done"
                  : i === wizardStep
                    ? "is-current"
                    : ""
              }`}
              title={label}
            />
          ))}
        </div>

        <div className="surface space-y-5 p-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              {steps[wizardStep]}
            </p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight">
              {wizardStep === 0 && "Como se chama esta página?"}
              {wizardStep === 1 && "Quais serviços nesta página?"}
              {wizardStep === 2 &&
                (isSalon
                  ? "Quando a equipe atende?"
                  : "Quando você atende?")}
              {wizardStep === 3 && "Como o cliente vê"}
              {wizardStep === 4 && "Tudo pronto!"}
            </h1>
          </div>

          {wizardStep === 0 && (
            <form onSubmit={(e) => void createWizardPage(e)} className="space-y-4">
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">Nome</span>
                <input
                  autoFocus
                  required
                  minLength={2}
                  className="input-field"
                  placeholder="Ex.: Salão Centro, Unidade Sul"
                  value={wizardTitle}
                  onChange={(e) => setWizardTitle(e.target.value)}
                />
              </label>
              {wizardError && (
                <p className="text-sm text-danger">{wizardError}</p>
              )}
              <button
                type="submit"
                disabled={wizardCreating}
                className="btn-primary w-full"
              >
                {wizardCreating ? "Criando…" : "Continuar"}
              </button>
            </form>
          )}

          {wizardStep === 1 && wPage && (
            <div className="space-y-4">
              <p className="text-sm text-muted">
                Marque os serviços do catálogo que esta página oferece.
                {isSalon
                  ? " No salão, eles também passam a ser oferecidos pelos profissionais ativos."
                  : " O catálogo é compartilhado; cada página escolhe o que oferecer."}
              </p>

              {orgCatalog.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border bg-muted-bg/40 p-4 text-sm text-muted">
                  Ainda não há serviços no catálogo. Cadastre o primeiro para
                  continuar.
                </p>
              ) : (
                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                  {orgCatalog.map((s) => {
                    const checked = selectedServiceIds.includes(s.id);
                    return (
                      <li key={s.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted-bg/40">
                          <input
                            type="checkbox"
                            className="accent-[var(--accent)]"
                            checked={checked}
                            onChange={() => {
                              setSelectedServiceIds((prev) =>
                                checked
                                  ? prev.filter((id) => id !== s.id)
                                  : [...prev, s.id],
                              );
                            }}
                          />
                          {s.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={s.imageUrl}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-lg object-cover"
                            />
                          ) : (
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted-bg text-xs font-semibold text-muted">
                              {s.title.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {s.title}
                            </p>
                            <p className="text-xs text-muted">
                              {s.durationMinutes} min · {formatBRL(s.priceCents)}
                            </p>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={openServiceModal}
                >
                  Novo serviço
                </button>
                <Link
                  href="/app/servicos"
                  className="btn-secondary !text-sm"
                >
                  Gerenciar catálogo
                </Link>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={
                    selectedServiceIds.length === 0 || savingServices
                  }
                  onClick={() => {
                    void (async () => {
                      const r = await savePageServiceIds(
                        wPage.id,
                        selectedServiceIds,
                      );
                      if (!r.ok) {
                        setWizardError(r.error || "Erro ao salvar");
                        return;
                      }
                      setWizardError("");
                      // Recarrega equipe (SALON) após sync de serviços
                      await loadPage(wPage.id);
                      setWizardStep(2);
                    })();
                  }}
                >
                  {savingServices ? "Salvando…" : "Continuar"}
                </button>
              </div>
              {wizardError && (
                <p className="text-sm text-danger">{wizardError}</p>
              )}

              {showServiceModal && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
                  <button
                    type="button"
                    aria-label="Fechar"
                    className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
                    onClick={() => {
                      if (creatingService) return;
                      setShowServiceModal(false);
                    }}
                  />
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="wizard-svc-title"
                    className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-white p-5 shadow-2xl shadow-black/15 sm:p-6"
                  >
                    <form
                      onSubmit={(e) => void createWizardService(e)}
                      className="space-y-4"
                    >
                      <div>
                        <h2
                          id="wizard-svc-title"
                          className="text-lg font-semibold tracking-tight"
                        >
                          Novo serviço
                        </h2>
                        <p className="mt-1 text-sm text-muted">
                          Entra no catálogo da conta e já fica marcado nesta
                          página.
                        </p>
                      </div>

                      <EntityImagePicker
                        shape="square"
                        fallbackLabel="Foto"
                        maxBytes={MAX_SERVICE_PHOTO_BYTES}
                        value={serviceForm.imageUrl || null}
                        onChange={(url) =>
                          setServiceForm((f) => ({
                            ...f,
                            imageUrl: url || "",
                          }))
                        }
                        onError={(err) => setServiceFormError(err)}
                      />

                      <label className="block text-sm">
                        <span className="mb-1 block font-medium">Nome</span>
                        <input
                          required
                          autoFocus
                          className="input-field"
                          placeholder="Ex.: Corte feminino"
                          value={serviceForm.title}
                          onChange={(e) =>
                            setServiceForm((f) => ({
                              ...f,
                              title: e.target.value,
                            }))
                          }
                        />
                      </label>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-sm">
                          <span className="mb-1 block font-medium">
                            Duração (min)
                          </span>
                          <input
                            required
                            inputMode="numeric"
                            className="input-field"
                            value={serviceForm.durationMinutes}
                            onChange={(e) =>
                              setServiceForm((f) => ({
                                ...f,
                                durationMinutes: maskMinutes(e.target.value),
                              }))
                            }
                          />
                        </label>
                        <label className="block text-sm">
                          <span className="mb-1 block font-medium">Preço</span>
                          <input
                            required
                            inputMode="numeric"
                            className="input-field"
                            value={serviceForm.priceMasked}
                            onChange={(e) =>
                              setServiceForm((f) => ({
                                ...f,
                                priceMasked: maskBRLFromDigits(e.target.value),
                              }))
                            }
                          />
                        </label>
                      </div>

                      <label className="block text-sm">
                        <span className="mb-1 block font-medium">
                          Descrição{" "}
                          <span className="font-normal text-muted">
                            (opcional)
                          </span>
                        </span>
                        <textarea
                          className="input-field"
                          rows={2}
                          placeholder="O que está incluso"
                          value={serviceForm.description}
                          onChange={(e) =>
                            setServiceForm((f) => ({
                              ...f,
                              description: e.target.value,
                            }))
                          }
                        />
                      </label>

                      {serviceFormError && (
                        <p className="text-sm text-danger">{serviceFormError}</p>
                      )}

                      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={creatingService}
                          onClick={() => setShowServiceModal(false)}
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={creatingService}
                          className="btn-primary"
                        >
                          {creatingService ? "Criando…" : "Salvar"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {wizardStep === 2 && wPage && (
            <div className="space-y-4">
              {isSalon ? (
                teamProCount === 0 ? (
                  <div className="space-y-3 rounded-xl border border-dashed border-border bg-muted-bg/40 p-4">
                    <p className="text-sm text-muted">
                      No salão, os horários são da equipe — não da página.
                      Cadastre pelo menos um profissional para continuar.
                    </p>
                    <Link href="/app/profissionais" className="btn-primary">
                      Cadastrar profissionais
                    </Link>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted">
                      Estes horários valem para toda a equipe (
                      {teamProCount} profissional
                      {teamProCount === 1 ? "" : "is"}). Ajuste individualmente
                      depois em Profissionais, se precisar.
                    </p>
                    <WeekHoursSimple
                      applyToAllProfessionals
                      initialRules={
                        wPage.teamHours?.length
                          ? wPage.teamHours
                          : wPage.availability || []
                      }
                      onSaved={(rules) =>
                        setPage((p) =>
                          p
                            ? {
                                ...p,
                                teamHours: rules,
                                teamHoursReady: rules.length > 0,
                                teamProfessionals: (p.teamProfessionals || []).map(
                                  (pro) => ({
                                    ...pro,
                                    hoursCount: rules.length,
                                  }),
                                ),
                              }
                            : p,
                        )
                      }
                    />
                  </>
                )
              ) : (
                <WeekHoursSimple
                  pageId={wPage.id}
                  initialRules={wPage.availability || []}
                  onSaved={(rules) =>
                    setPage((p) => (p ? { ...p, availability: rules } : p))
                  }
                />
              )}
              <button
                type="button"
                className="btn-primary w-full"
                disabled={!wCheck?.hours}
                onClick={() => setWizardStep(3)}
              >
                Continuar
              </button>
            </div>
          )}

          {wizardStep === 3 && wPage && (
            <div className="space-y-4">
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">
                  Nome no link do cliente
                </span>
                <input
                  className="input-field"
                  value={wPage.title}
                  onChange={(e) =>
                    setPage((p) =>
                      p ? { ...p, title: e.target.value } : p,
                    )
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">
                  Descrição curta (opcional)
                </span>
                <textarea
                  className="input-field min-h-[72px]"
                  value={wPage.description || ""}
                  onChange={(e) =>
                    setPage((p) =>
                      p ? { ...p, description: e.target.value } : p,
                    )
                  }
                />
              </label>
              <button
                type="button"
                className="btn-primary w-full"
                disabled={wPage.title.trim().length < 2}
                onClick={() => {
                  void savePageMetaNow().then(() => setWizardStep(4));
                }}
              >
                Continuar
              </button>
            </div>
          )}

          {wizardStep === 4 && wPage && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted">
                Sua página está pronta para compartilhar.
              </p>
              <p className="break-all rounded-xl bg-muted-bg px-3 py-2 text-xs">
                {publicUrl}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <CopyLinkButton url={publicUrl} />
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                >
                  Abrir
                </a>
              </div>
              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
                <Link href="/app/agendador" className="btn-secondary">
                  Ir para a lista
                </Link>
                {isSalon && (
                  <Link href="/app/profissionais" className="btn-secondary">
                    Gerenciar equipe
                  </Link>
                )}
                <Link
                  href={`/app/agendador?id=${wPage.id}`}
                  className="btn-primary"
                >
                  Editar
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ─── EDITAR ─── */
  if (!page || !checklist) {
    return <p className="text-sm text-muted">Carregando…</p>;
  }

  const publicUrl = orgSlug
    ? bookingPublicUrl(orgSlug, page.slug)
    : `${appUrl}/p/${page.slug}`;
  const activeServices = page.services.filter((s) => s.isActive).length;

  const sections: {
    id: SectionId;
    title: string;
    summary: string;
    done: boolean;
  }[] = [
    {
      id: "servicos",
      title: "Serviços",
      summary: checklist.services
        ? `${activeServices} ativo(s)`
        : "Cadastre pelo menos um",
      done: checklist.services,
    },
    {
      id: "horarios",
      title: "Horários",
      summary: checklist.hours
        ? businessMode === "SALON"
          ? summarizeHours(page.teamHours || [])
          : summarizeHours(page.availability || [])
        : businessMode === "SALON"
          ? "Defina quando a equipe atende"
          : "Defina quando atende",
      done: checklist.hours,
    },
    {
      id: "pagina",
      title: "Página do cliente",
      summary: checklist.name ? page.title : "Nome e aparência",
      done: checklist.name,
    },
  ];

  return (
    <div className="pages-hub mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          href="/app/agendador"
          className="font-medium text-muted underline-offset-2 hover:text-foreground hover:underline"
        >
          ← Páginas
        </Link>
      </div>

      <div className="pages-hub-bar surface sticky top-14 z-20 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-base font-semibold tracking-tight">
                {page.title}
              </h1>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  ready
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-800"
                }`}
              >
                {ready ? "Pronto" : setupLabel(checklist)}
              </span>
            </div>
            {!ready && (
              <p className="mt-0.5 text-xs text-muted">
                Complete os itens abaixo para compartilhar o link.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {ready && (
              <>
                <CopyLinkButton url={publicUrl} />
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary !py-1.5 !text-xs"
                >
                  Abrir
                </a>
              </>
            )}
            {!ready && (
              <button
                type="button"
                className="btn-primary !py-1.5 !text-xs"
                onClick={() => {
                  const next = sections.find((s) => !s.done);
                  if (next) setOpenSection(next.id);
                }}
              >
                Próximo
              </button>
            )}
          </div>
        </div>
      </div>

      {msg && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-danger">
          {msg}
        </p>
      )}

      <div className="space-y-3">
        {sections.map((sec) => {
          const open = openSection === sec.id;
          return (
            <section key={sec.id} className="pages-hub-accordion surface overflow-hidden">
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                aria-expanded={open}
                onClick={() => setOpenSection(sec.id)}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    sec.done
                      ? "bg-emerald-500 text-white"
                      : "bg-muted-bg text-muted"
                  }`}
                >
                  {sec.done ? "✓" : "·"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{sec.title}</span>
                  <span className="block text-xs text-muted">{sec.summary}</span>
                </span>
                <span
                  className={`text-muted transition ${open ? "rotate-180" : ""}`}
                >
                  ▾
                </span>
              </button>

              {open && (
                <div
                  className={`border-t border-border ${
                    sec.id === "pagina" ? "px-3 py-3 sm:px-4 sm:py-4" : "px-4 py-4"
                  }`}
                >
                  {sec.id === "servicos" && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted">
                        Escolha quais serviços do catálogo esta página oferece no
                        link público.
                        {businessMode === "SALON"
                          ? " Ao salvar, eles são vinculados aos profissionais ativos."
                          : ""}
                      </p>
                      {orgCatalog.length === 0 ? (
                        <p className="text-sm text-muted">
                          Nenhum serviço no catálogo.{" "}
                          <Link
                            href="/app/servicos"
                            className="font-medium underline-offset-2 hover:underline"
                          >
                            Cadastrar em Serviços
                          </Link>
                        </p>
                      ) : (
                        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                          {orgCatalog.map((s) => {
                            const checked = selectedServiceIds.includes(s.id);
                            return (
                              <li key={s.id}>
                                <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted-bg/40">
                                  <input
                                    type="checkbox"
                                    className="accent-[var(--accent)]"
                                    checked={checked}
                                    onChange={() => {
                                      setSelectedServiceIds((prev) =>
                                        checked
                                          ? prev.filter((id) => id !== s.id)
                                          : [...prev, s.id],
                                      );
                                    }}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">
                                      {s.title}
                                    </p>
                                    <p className="text-xs text-muted">
                                      {s.durationMinutes} min ·{" "}
                                      {formatBRL(s.priceCents)}
                                    </p>
                                  </div>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-primary !text-sm"
                          disabled={
                            selectedServiceIds.length === 0 || savingServices
                          }
                          onClick={() => {
                            void (async () => {
                              const r = await savePageServiceIds(
                                page.id,
                                selectedServiceIds,
                              );
                              if (!r.ok) setMsg(r.error || "Erro ao salvar");
                              else setMsg("");
                            })();
                          }}
                        >
                          {savingServices ? "Salvando…" : "Salvar seleção"}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary !text-sm"
                          onClick={openServiceModal}
                        >
                          Novo serviço
                        </button>
                        <Link
                          href="/app/servicos"
                          className="btn-secondary inline-flex !text-sm"
                        >
                          Catálogo
                        </Link>
                      </div>
                    </div>
                  )}

                  {sec.id === "horarios" &&
                    (businessMode === "SALON" ? (
                      (page.teamProfessionals?.length ?? 0) === 0 ? (
                        <div className="space-y-3">
                          <p className="text-sm text-muted">
                            No salão, os horários ficam nos profissionais. Cadastre
                            a equipe para liberar agenda no link.
                          </p>
                          <Link
                            href="/app/profissionais"
                            className="btn-primary inline-flex !text-sm"
                          >
                            Ir para profissionais
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm text-muted">
                            Horários aplicados a toda a equipe. Ajustes por pessoa
                            em{" "}
                            <Link
                              href="/app/profissionais"
                              className="font-medium underline-offset-2 hover:underline"
                            >
                              Profissionais
                            </Link>
                            .
                          </p>
                          <WeekHoursSimple
                            applyToAllProfessionals
                            initialRules={
                              page.teamHours?.length
                                ? page.teamHours
                                : page.availability || []
                            }
                            onSaved={(rules) =>
                              setPage((p) =>
                                p
                                  ? {
                                      ...p,
                                      teamHours: rules,
                                      teamHoursReady: rules.length > 0,
                                      teamProfessionals: (
                                        p.teamProfessionals || []
                                      ).map((pro) => ({
                                        ...pro,
                                        hoursCount: rules.length,
                                      })),
                                    }
                                  : p,
                              )
                            }
                          />
                        </div>
                      )
                    ) : (
                      <WeekHoursSimple
                        pageId={page.id}
                        initialRules={page.availability || []}
                        onSaved={(rules) =>
                          setPage((p) =>
                            p ? { ...p, availability: rules } : p,
                          )
                        }
                      />
                    ))}

                  {sec.id === "pagina" && (
                    <AgendadorWelcomeEditor
                      pageId={page.id}
                      title={page.title}
                      description={page.description || ""}
                      coverImageUrl={page.coverImageUrl}
                      orgLogoUrl={orgLogoUrl}
                      orgAccent={orgAccent}
                      publicUrl={publicUrl}
                      showShareActions={false}
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
                        setPage((p) =>
                          p ? { ...p, description: value } : p,
                        )
                      }
                      onCoverFile={handleCoverFile}
                      onRemoveCover={() => {
                        setPage((p) =>
                          p ? { ...p, coverImageUrl: null } : p,
                        );
                        void fetch(`/api/pages/${page.id}/cover`, {
                          method: "DELETE",
                        });
                      }}
                      onServiceChange={handleServiceChange}
                      onServiceImageFile={handleServiceImageFile}
                      onSaveAll={saveAllPageChanges}
                    />
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <div className="rounded-2xl border border-red-100 bg-red-50/50 p-5">
        <p className="text-sm font-semibold text-red-900">Excluir página</p>
        <div className="mt-3">
          <DeletePageButton
            pageId={page.id}
            pageTitle={page.title}
            redirectTo="/app/agendador"
          />
        </div>
      </div>

      {showServiceModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={() => {
              if (creatingService) return;
              setShowServiceModal(false);
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-svc-title"
            className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-white p-5 shadow-2xl shadow-black/15 sm:p-6"
          >
            <form
              onSubmit={(e) => void createWizardService(e)}
              className="space-y-4"
            >
              <div>
                <h2
                  id="edit-svc-title"
                  className="text-lg font-semibold tracking-tight"
                >
                  Novo serviço
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Entra no catálogo e já fica marcado nesta página.
                </p>
              </div>
              <EntityImagePicker
                shape="square"
                fallbackLabel="Foto"
                maxBytes={MAX_SERVICE_PHOTO_BYTES}
                value={serviceForm.imageUrl || null}
                onChange={(url) =>
                  setServiceForm((f) => ({ ...f, imageUrl: url || "" }))
                }
                onError={(err) => setServiceFormError(err)}
              />
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Nome</span>
                <input
                  required
                  autoFocus
                  className="input-field"
                  value={serviceForm.title}
                  onChange={(e) =>
                    setServiceForm((f) => ({ ...f, title: e.target.value }))
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
                    value={serviceForm.durationMinutes}
                    onChange={(e) =>
                      setServiceForm((f) => ({
                        ...f,
                        durationMinutes: maskMinutes(e.target.value),
                      }))
                    }
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Preço</span>
                  <input
                    required
                    inputMode="numeric"
                    className="input-field"
                    value={serviceForm.priceMasked}
                    onChange={(e) =>
                      setServiceForm((f) => ({
                        ...f,
                        priceMasked: maskBRLFromDigits(e.target.value),
                      }))
                    }
                  />
                </label>
              </div>
              {serviceFormError && (
                <p className="text-sm text-danger">{serviceFormError}</p>
              )}
              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={creatingService}
                  onClick={() => setShowServiceModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingService}
                  className="btn-primary"
                >
                  {creatingService ? "Criando…" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
