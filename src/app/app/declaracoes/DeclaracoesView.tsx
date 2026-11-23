"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AttendancePreview } from "@/components/documents/AttendanceDocument";
import {
  ATESTADO_DEFAULT_SIGNER_CRM,
  ATESTADO_DEFAULT_SIGNER_NAME,
  ATESTADO_DEFAULT_SIGNER_SPECIALTY,
  ATESTADO_DEFAULT_TITLE,
  ATESTADO_KIND,
  ATESTADO_PADRAO_KIND,
  COMPARECIMENTO_KIND,
  ENCAMINHAMENTO_KIND,
  RECEITA_KIND,
  defaultAtestadoBody,
  defaultAtestadoFooterLeft,
  defaultAtestadoFooterRight,
  defaultAtestadoPadraoBody,
  defaultEncaminhamentoBody,
  defaultReceitaBody,
  isAtestadoEspecialKind,
  kindLabel,
  parseAttendanceKind,
  type AttendanceKind,
} from "@/lib/attendance/atestado";
import {
  formatShortDate,
  formatTime,
  todayIsoDate,
  type AttendanceHeader,
} from "@/lib/attendance/format";
import type { AttendanceCertificateDTO } from "@/lib/attendance/serialize";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { formatCpf, formatPhoneDisplay } from "@/lib/utils";

type Props = {
  initialHeader: AttendanceHeader;
  initialItems: AttendanceCertificateDTO[];
  currentUserName?: string;
  atestadoEnabled?: boolean;
  prescriptionsEnabled?: boolean;
};

type FormState = {
  kind: AttendanceKind;
  patientName: string;
  customerId: string | null;
  visitDate: string;
  startTime: string;
  endTime: string;
  issueDate: string;
  issueCity: string;
  title: string;
  bodyText: string;
  footerLeft: string;
  footerRight: string;
  signerName: string;
  signerSpecialty: string;
  signerCrm: string;
};

type PatientHit = {
  id: string;
  name: string;
  phoneE164: string;
  cpf: string | null;
};

const HEADER_FIELDS: {
  key: keyof AttendanceHeader;
  label: string;
  placeholder?: string;
  wide?: boolean;
}[] = [
  { key: "businessName", label: "Nome da clínica", wide: true },
  { key: "address", label: "Endereço", wide: true },
  { key: "phone", label: "Telefone / WhatsApp", placeholder: "(19) 99999-9999" },
  { key: "cnpj", label: "CNPJ (opcional)", placeholder: "Deixe vazio se não houver" },
  { key: "city", label: "Cidade da emissão", placeholder: "Piracicaba/SP" },
  { key: "signerName", label: "Nome de quem assina" },
  {
    key: "signerTitle",
    label: "Linha abaixo do nome",
    placeholder: "Usa o nome da clínica se vazio",
  },
  {
    key: "signerPhone",
    label: "Telefone na assinatura",
    placeholder: "Usa o telefone do cabeçalho se vazio",
  },
];

function emptyForm(headerCity = "", userName = ""): FormState {
  const today = todayIsoDate();
  return {
    kind: COMPARECIMENTO_KIND,
    patientName: "",
    customerId: null,
    visitDate: today,
    startTime: "",
    endTime: "",
    issueDate: today,
    issueCity: headerCity || "Piracicaba-SP",
    title: "",
    bodyText: "",
    footerLeft: defaultAtestadoFooterLeft({ issueDate: today }),
    footerRight: defaultAtestadoFooterRight(userName),
    signerName: ATESTADO_DEFAULT_SIGNER_NAME,
    signerSpecialty: ATESTADO_DEFAULT_SIGNER_SPECIALTY,
    signerCrm: ATESTADO_DEFAULT_SIGNER_CRM,
  };
}

function pdfUrl(id: string) {
  return `/api/declaracoes/${id}/pdf`;
}

function printUrl(id: string) {
  return `/app/declaracoes/${id}/imprimir`;
}

function triggerDownload(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function defaultsForKind(
  kind: AttendanceKind,
  base: FormState,
  opts?: { cpf?: string | null },
): Partial<FormState> {
  if (kind === ATESTADO_KIND) {
    return {
      title: ATESTADO_DEFAULT_TITLE,
      bodyText: defaultAtestadoBody({
        patientName: base.patientName,
        visitDate: base.issueDate || base.visitDate,
      }),
      footerLeft: defaultAtestadoFooterLeft({ issueDate: base.issueDate }),
      footerRight: base.footerRight,
    };
  }
  if (kind === ENCAMINHAMENTO_KIND) {
    return {
      title: "Encaminhamento",
      bodyText: defaultEncaminhamentoBody({ patientName: base.patientName }),
    };
  }
  if (kind === RECEITA_KIND) {
    return {
      title: "Receita / orientação",
      bodyText: defaultReceitaBody(),
    };
  }
  if (kind === ATESTADO_PADRAO_KIND) {
    return {
      title: "Atestado",
      bodyText: defaultAtestadoPadraoBody({
        patientName: base.patientName,
        visitDate: base.issueDate || base.visitDate,
        cpf: opts?.cpf,
      }),
    };
  }
  return { title: "", bodyText: "" };
}

export function DeclaracoesView({
  initialHeader,
  initialItems,
  currentUserName = "",
  atestadoEnabled = false,
  prescriptionsEnabled = false,
}: Props) {
  const searchParams = useSearchParams();
  const [header, setHeader] = useState(initialHeader);
  const [headerDraft, setHeaderDraft] = useState(initialHeader);
  const [headerOpen, setHeaderOpen] = useState(false);
  const [headerSaving, setHeaderSaving] = useState(false);
  const [headerMsg, setHeaderMsg] = useState("");

  const [form, setForm] = useState<FormState>(() =>
    emptyForm(initialHeader.city, currentUserName),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState<"pdf" | "print" | "save" | null>(null);
  const [error, setError] = useState("");
  const [lastCreated, setLastCreated] = useState<AttendanceCertificateDTO | null>(null);
  const [copyMsg, setCopyMsg] = useState("");

  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");

  const [patientMode, setPatientMode] = useState<"quick" | "registered">("quick");
  const [patientQuery, setPatientQuery] = useState("");
  const [patientHits, setPatientHits] = useState<PatientHit[]>([]);
  const [patientSearching, setPatientSearching] = useState(false);
  const [selectedPatientCpf, setSelectedPatientCpf] = useState<string | null>(null);

  const isEspecial = form.kind === ATESTADO_KIND;
  const isComparecimento = form.kind === COMPARECIMENTO_KIND;
  const isTextDoc =
    form.kind === ENCAMINHAMENTO_KIND ||
    form.kind === RECEITA_KIND ||
    form.kind === ATESTADO_PADRAO_KIND;
  const isEditing = Boolean(editingId);
  const previewHeader = headerOpen ? headerDraft : header;

  const kindCards = useMemo(() => {
    const cards: { kind: AttendanceKind; label: string; hint: string }[] = [
      { kind: COMPARECIMENTO_KIND, label: "Comparecimento", hint: "Horário de permanência" },
      { kind: ENCAMINHAMENTO_KIND, label: "Encaminhamento", hint: "Indicação / destino" },
      ...(prescriptionsEnabled
        ? [{ kind: RECEITA_KIND as AttendanceKind, label: "Receita", hint: "Orientação imprimível" }]
        : []),
      { kind: ATESTADO_PADRAO_KIND, label: "Atestado", hint: "Timbre da clínica" },
    ];
    if (atestadoEnabled) {
      cards.push({
        kind: ATESTADO_KIND,
        label: "Atestado especial",
        hint: "Template UPA",
      });
    }
    return cards;
  }, [atestadoEnabled, prescriptionsEnabled]);

  useEffect(() => {
    const customerId = searchParams.get("customerId");
    const kindParam = parseAttendanceKind(searchParams.get("kind"));
    if (!customerId) {
      if (kindParam && (kindParam !== ATESTADO_KIND || atestadoEnabled)) {
        if (kindParam === RECEITA_KIND && !prescriptionsEnabled) return;
        setForm((f) => ({
          ...f,
          kind: kindParam,
          ...defaultsForKind(kindParam, f),
        }));
      }
      return;
    }
    setPatientMode("registered");
    fetch(`/api/clients/${customerId}`)
      .then(async (r) => {
        if (!r.ok) return;
        const data = await r.json();
        const c = data.customer as PatientHit | undefined;
        if (!c) return;
        const nextKind =
          kindParam && (kindParam !== ATESTADO_KIND || atestadoEnabled)
            ? kindParam === RECEITA_KIND && !prescriptionsEnabled
              ? COMPARECIMENTO_KIND
              : kindParam
            : COMPARECIMENTO_KIND;
        setSelectedPatientCpf(c.cpf);
        setForm((f) => {
          const base = {
            ...f,
            kind: nextKind,
            patientName: c.name,
            customerId: c.id,
          };
          return { ...base, ...defaultsForKind(nextKind, base, { cpf: c.cpf }) };
        });
      })
      .catch(() => undefined);
    // só na montagem / mudança de query
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (patientMode !== "registered") return;
    const q = patientQuery.trim();
    if (q.length < 2) {
      setPatientHits([]);
      return;
    }
    const t = setTimeout(() => {
      setPatientSearching(true);
      fetch(`/api/clients?q=${encodeURIComponent(q)}&take=8`)
        .then(async (r) => {
          if (!r.ok) return;
          const data = await r.json();
          setPatientHits(
            ((data.clients || data.customers || []) as PatientHit[]).map((c) => ({
              id: c.id,
              name: c.name,
              phoneE164: c.phoneE164,
              cpf: c.cpf ?? null,
            })),
          );
        })
        .catch(() => undefined)
        .finally(() => setPatientSearching(false));
    }, 250);
    return () => clearTimeout(t);
  }, [patientQuery, patientMode]);

  const previewData = useMemo(
    () => ({
      kind: form.kind,
      patientName: form.patientName,
      visitDate: form.visitDate,
      startTime: form.startTime,
      endTime: form.endTime,
      issueDate: form.issueDate,
      issueCity: isEspecial
        ? form.issueCity || previewHeader.city
        : previewHeader.city || form.issueCity,
      title: form.title,
      bodyText: form.bodyText,
      footerLeft: form.footerLeft,
      footerRight: form.footerRight,
      signerName: form.signerName,
      signerSpecialty: form.signerSpecialty,
      signerCrm: form.signerCrm,
    }),
    [form, isEspecial, previewHeader.city],
  );

  const filtered = useMemo(() => {
    const visible = atestadoEnabled
      ? items
      : items.filter((it) => !isAtestadoEspecialKind(it.kind));
    const q = search
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (!q) return visible;
    return visible.filter((it) =>
      it.patientName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .includes(q),
    );
  }, [items, search, atestadoEnabled]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (
        f.kind === ATESTADO_KIND &&
        (key === "patientName" || key === "issueDate") &&
        f.bodyText.includes("PORTADOR DA PATOLOGIA _______________")
      ) {
        next.bodyText = defaultAtestadoBody({
          patientName: key === "patientName" ? String(value) : f.patientName,
          visitDate:
            key === "issueDate" ? String(value) : f.issueDate || f.visitDate,
        });
      }
      if (
        f.kind === ATESTADO_KIND &&
        key === "issueDate" &&
        f.footerLeft.includes("Relatorio Atestado Mediico Paciente.rpt")
      ) {
        next.footerLeft = defaultAtestadoFooterLeft({
          issueDate: String(value),
        });
      }
      return next;
    });
    setError("");
  }

  function setKind(kind: AttendanceKind) {
    if (kind === ATESTADO_KIND && !atestadoEnabled) return;
    if (kind === RECEITA_KIND && !prescriptionsEnabled) return;
    if (isEditing) return;
    setForm((f) => ({
      ...f,
      kind,
      ...defaultsForKind(kind, f, { cpf: selectedPatientCpf }),
    }));
    setError("");
    setLastCreated(null);
  }

  function selectPatient(p: PatientHit) {
    setSelectedPatientCpf(p.cpf);
    setForm((f) => {
      const base = { ...f, patientName: p.name, customerId: p.id };
      return {
        ...base,
        ...defaultsForKind(f.kind, base, { cpf: p.cpf }),
      };
    });
    setPatientQuery(p.name);
    setPatientHits([]);
  }

  function clearPatient() {
    setSelectedPatientCpf(null);
    setForm((f) => ({ ...f, customerId: null }));
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm(header.city, currentUserName));
    setError("");
    setLastCreated(null);
  }

  function startEdit(item: AttendanceCertificateDTO) {
    if (isAtestadoEspecialKind(item.kind) && !atestadoEnabled) {
      setError("Atestado especial não está disponível nesta conta");
      return;
    }
    setSelectedPatientCpf(null);
    if (isAtestadoEspecialKind(item.kind)) {
      setForm({
        kind: ATESTADO_KIND,
        patientName: item.patientName,
        customerId: item.customerId,
        visitDate: item.visitDate || item.issueDate,
        startTime: item.startTime || "",
        endTime: item.endTime || "",
        issueDate: item.issueDate,
        issueCity: item.issueCity || header.city || "Piracicaba-SP",
        title: item.title || ATESTADO_DEFAULT_TITLE,
        bodyText:
          item.bodyText ||
          defaultAtestadoBody({
            patientName: item.patientName,
            visitDate: item.issueDate,
          }),
        footerLeft:
          item.footerLeft ||
          defaultAtestadoFooterLeft({ issueDate: item.issueDate }),
        footerRight:
          item.footerRight || defaultAtestadoFooterRight(currentUserName),
        signerName: item.signerName || ATESTADO_DEFAULT_SIGNER_NAME,
        signerSpecialty:
          item.signerSpecialty || ATESTADO_DEFAULT_SIGNER_SPECIALTY,
        signerCrm: item.signerCrm || ATESTADO_DEFAULT_SIGNER_CRM,
      });
    } else if (item.kind === COMPARECIMENTO_KIND) {
      setForm({
        ...emptyForm(header.city, currentUserName),
        kind: COMPARECIMENTO_KIND,
        patientName: item.patientName,
        customerId: item.customerId,
        visitDate: item.visitDate,
        startTime: item.startTime,
        endTime: item.endTime,
        issueDate: item.issueDate,
      });
    } else {
      setForm({
        ...emptyForm(header.city, currentUserName),
        kind: item.kind,
        patientName: item.patientName,
        customerId: item.customerId,
        visitDate: item.visitDate || item.issueDate,
        issueDate: item.issueDate,
        issueCity: item.issueCity || header.city,
        title: item.title || "",
        bodyText: item.bodyText || "",
      });
    }
    if (item.customerId) setPatientMode("registered");
    setEditingId(item.id);
    setLastCreated(null);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validate() {
    if (form.patientName.trim().length < 3) return "Informe o nome completo do paciente";
    if (!form.issueDate) return "Informe a data de emissão";
    if (isEspecial) {
      if (!form.title.trim()) return "Informe o título do atestado";
      if (form.bodyText.trim().length < 20) return "Informe o texto do atestado";
      return "";
    }
    if (isTextDoc) {
      if (form.bodyText.trim().length < 10) return "Informe o texto do documento";
      return "";
    }
    if (!form.visitDate) return "Informe a data do atendimento";
    if (!form.startTime || !form.endTime) return "Informe os horários de entrada e saída";
    if (form.endTime <= form.startTime) return "O horário de saída precisa ser depois da entrada";
    return "";
  }

  function buildPayload() {
    const base = {
      patientName: form.patientName,
      customerId: form.customerId,
      issueDate: form.issueDate,
    };
    if (isEspecial) {
      return {
        ...base,
        kind: ATESTADO_KIND,
        issueCity: form.issueCity || header.city,
        title: form.title,
        bodyText: form.bodyText,
        footerLeft: form.footerLeft,
        footerRight: form.footerRight,
        signerName: form.signerName,
        signerSpecialty: form.signerSpecialty,
        signerCrm: form.signerCrm,
        visitDate: form.issueDate,
      };
    }
    if (isTextDoc) {
      return {
        ...base,
        kind: form.kind,
        issueCity: form.issueCity || header.city,
        title: form.title,
        bodyText: form.bodyText,
        visitDate: form.visitDate || form.issueDate,
      };
    }
    return {
      ...base,
      kind: COMPARECIMENTO_KIND,
      visitDate: form.visitDate,
      startTime: form.startTime,
      endTime: form.endTime,
    };
  }

  async function create(mode: "pdf" | "print" | "save") {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    const printWindow =
      mode === "print" && !isEditing ? window.open("about:blank", "_blank") : null;
    setSaving(mode);
    setError("");

    const res = await fetch(
      isEditing ? `/api/declaracoes/${editingId}` : "/api/declaracoes",
      {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      },
    );
    const data = await res.json().catch(() => ({}));
    setSaving(null);
    if (!res.ok || !data.item) {
      printWindow?.close();
      setError(
        data.error ||
          (isEditing
            ? "Não foi possível salvar as alterações"
            : "Não foi possível gerar o documento"),
      );
      return;
    }
    const item = data.item as AttendanceCertificateDTO;
    if (isEditing) {
      setItems((prev) => prev.map((it) => (it.id === item.id ? item : it)));
      setLastCreated(item);
      setEditingId(null);
      setForm((f) => ({
        ...emptyForm(header.city, currentUserName),
        kind: f.kind,
        customerId: f.customerId,
        patientName: f.customerId ? f.patientName : "",
        ...defaultsForKind(f.kind, {
          ...emptyForm(header.city, currentUserName),
          kind: f.kind,
          patientName: f.customerId ? f.patientName : "",
        }, { cpf: selectedPatientCpf }),
      }));
    } else {
      setItems((prev) => [item, ...prev]);
      setLastCreated(item);
      setForm((f) => ({
        ...emptyForm(header.city, currentUserName),
        kind: f.kind,
        customerId: f.customerId,
        patientName: f.customerId ? f.patientName : "",
        visitDate: f.visitDate,
        issueDate: f.issueDate,
        issueCity: f.issueCity,
        ...defaultsForKind(f.kind, {
          ...emptyForm(header.city, currentUserName),
          kind: f.kind,
          patientName: f.customerId ? f.patientName : "",
          issueDate: f.issueDate,
          visitDate: f.visitDate,
        }, { cpf: selectedPatientCpf }),
      }));
    }
    if (mode === "pdf") {
      triggerDownload(pdfUrl(item.id));
    } else if (mode === "print") {
      if (printWindow) {
        printWindow.location.href = printUrl(item.id);
      } else {
        window.open(printUrl(item.id), "_blank");
      }
    }
  }

  function reuse(item: AttendanceCertificateDTO) {
    if (isAtestadoEspecialKind(item.kind) && !atestadoEnabled) {
      setError("Atestado especial não está disponível nesta conta");
      return;
    }
    startEdit(item);
    setEditingId(null);
  }

  async function copyShare(item: AttendanceCertificateDTO) {
    if (!item.shareUrl) {
      setCopyMsg("Link indisponível — regenere o compartilhamento");
      return;
    }
    const absolute = `${window.location.origin}${item.shareUrl}`;
    try {
      await navigator.clipboard.writeText(absolute);
      setCopyMsg("Link copiado");
      setTimeout(() => setCopyMsg(""), 2000);
    } catch {
      setCopyMsg(absolute);
    }
  }

  async function shareAction(item: AttendanceCertificateDTO, action: "revoke" | "regenerate") {
    const res = await fetch(`/api/declaracoes/${item.id}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.item) {
      setError(data.error || "Não foi possível atualizar o link");
      return;
    }
    const updated = data.item as AttendanceCertificateDTO;
    setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
    if (lastCreated?.id === updated.id) setLastCreated(updated);
    if (action === "regenerate" && updated.shareUrl) {
      await copyShare(updated);
    }
  }

  async function saveHeader() {
    setHeaderSaving(true);
    setHeaderMsg("");
    const res = await fetch("/api/declaracoes/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(headerDraft),
    });
    const data = await res.json().catch(() => ({}));
    setHeaderSaving(false);
    if (!res.ok || !data.header) {
      setHeaderMsg(data.error || "Não foi possível salvar o cabeçalho");
      return;
    }
    setHeader(data.header);
    setHeaderDraft(data.header);
    setHeaderMsg("Cabeçalho salvo. Vale para as próximas declarações.");
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader>
        Escolha o tipo, use um paciente cadastrado ou preencha na hora — depois baixe,
        imprima ou compartilhe o link.
      </AdminPageHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="space-y-4">
          <form
            className="surface space-y-4 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              void create("pdf");
            }}
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold tracking-tight">
                  {isEditing ? "Editar documento" : "Novo documento"}
                </h2>
                {isEditing && (
                  <button
                    type="button"
                    className="text-xs text-muted underline-offset-2 hover:underline"
                    onClick={cancelEdit}
                  >
                    Cancelar edição
                  </button>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/30 p-1">
                <button
                  type="button"
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    patientMode === "quick"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                  onClick={() => setPatientMode("quick")}
                >
                  Novo rápido
                </button>
                <button
                  type="button"
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    patientMode === "registered"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                  onClick={() => setPatientMode("registered")}
                >
                  Paciente cadastrado
                </button>
              </div>

              {!isEditing && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {kindCards.map((card) => (
                    <button
                      key={card.kind}
                      type="button"
                      disabled={isEditing}
                      onClick={() => setKind(card.kind)}
                      className={`rounded-xl border px-3 py-2.5 text-left transition ${
                        form.kind === card.kind
                          ? "border-foreground/30 bg-background shadow-sm"
                          : "border-border bg-muted/20 hover:bg-muted/40"
                      }`}
                    >
                      <span className="block text-sm font-medium">{card.label}</span>
                      <span className="mt-0.5 block text-[11px] text-muted">{card.hint}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {patientMode === "registered" ? (
              <div className="space-y-2">
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium">Buscar paciente</span>
                  <input
                    className="input-field"
                    value={patientQuery}
                    onChange={(e) => {
                      setPatientQuery(e.target.value);
                      if (form.customerId) clearPatient();
                    }}
                    placeholder="Nome, telefone ou e-mail"
                    autoComplete="off"
                  />
                </label>
                {patientSearching && (
                  <p className="text-xs text-muted">Buscando…</p>
                )}
                {patientHits.length > 0 && (
                  <ul className="overflow-hidden rounded-lg border border-border">
                    {patientHits.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-muted/40"
                          onClick={() => selectPatient(p)}
                        >
                          <span className="font-medium">{p.name}</span>
                          <span className="text-xs text-muted">
                            {formatPhoneDisplay(p.phoneE164)}
                            {p.cpf ? ` · CPF ${formatCpf(p.cpf)}` : ""}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {form.customerId && (
                  <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                    Vinculado ao prontuário · {form.patientName}
                    <button
                      type="button"
                      className="ml-2 underline"
                      onClick={clearPatient}
                    >
                      limpar
                    </button>
                  </p>
                )}
              </div>
            ) : (
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">Nome completo do paciente</span>
                <input
                  className="input-field"
                  value={form.patientName}
                  onChange={(e) => {
                    clearPatient();
                    update("patientName", e.target.value);
                  }}
                  placeholder="Ex.: Maria da Silva Souza"
                  autoComplete="off"
                  maxLength={160}
                />
              </label>
            )}

            {patientMode === "registered" && !form.customerId && (
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">Nome (se ainda não selecionou)</span>
                <input
                  className="input-field"
                  value={form.patientName}
                  onChange={(e) => update("patientName", e.target.value)}
                  placeholder="Ou digite o nome completo"
                  autoComplete="off"
                  maxLength={160}
                />
              </label>
            )}

            {isEspecial ? (
              <>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium">Título</span>
                  <input
                    className="input-field"
                    value={form.title}
                    onChange={(e) => update("title", e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium">Texto do atestado</span>
                  <textarea
                    className="input-field min-h-[160px]"
                    value={form.bodyText}
                    onChange={(e) => update("bodyText", e.target.value)}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium">Data de emissão</span>
                    <input
                      type="date"
                      className="input-field"
                      value={form.issueDate}
                      onChange={(e) => update("issueDate", e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium">Cidade</span>
                    <input
                      className="input-field"
                      value={form.issueCity}
                      onChange={(e) => update("issueCity", e.target.value)}
                    />
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium">Nome do assinante</span>
                    <input
                      className="input-field"
                      value={form.signerName}
                      onChange={(e) => update("signerName", e.target.value)}
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-sm">
                      <span className="mb-1.5 block font-medium">Especialidade</span>
                      <input
                        className="input-field"
                        value={form.signerSpecialty}
                        onChange={(e) => update("signerSpecialty", e.target.value)}
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1.5 block font-medium">CRM</span>
                      <input
                        className="input-field"
                        value={form.signerCrm}
                        onChange={(e) => update("signerCrm", e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              </>
            ) : isTextDoc ? (
              <>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium">Título</span>
                  <input
                    className="input-field"
                    value={form.title}
                    onChange={(e) => update("title", e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium">Texto</span>
                  <textarea
                    className="input-field min-h-[160px]"
                    value={form.bodyText}
                    onChange={(e) => update("bodyText", e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium">Data de emissão</span>
                  <input
                    type="date"
                    className="input-field"
                    value={form.issueDate}
                    onChange={(e) => update("issueDate", e.target.value)}
                  />
                </label>
              </>
            ) : (
              <>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium">Data do atendimento</span>
                  <input
                    type="date"
                    className="input-field"
                    value={form.visitDate}
                    onChange={(e) => update("visitDate", e.target.value)}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium">Entrada</span>
                    <input
                      type="time"
                      className="input-field"
                      value={form.startTime}
                      onChange={(e) => update("startTime", e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium">Saída</span>
                    <input
                      type="time"
                      className="input-field"
                      value={form.endTime}
                      onChange={(e) => update("endTime", e.target.value)}
                    />
                  </label>
                </div>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium">Data de emissão</span>
                  <input
                    type="date"
                    className="input-field"
                    value={form.issueDate}
                    onChange={(e) => update("issueDate", e.target.value)}
                  />
                </label>
              </>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
            {copyMsg && <p className="text-sm text-muted">{copyMsg}</p>}

            <div className="flex flex-col gap-2 sm:flex-row">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    className="btn-primary flex-1"
                    disabled={saving !== null}
                    onClick={() => void create("save")}
                  >
                    {saving === "save" ? "Salvando…" : "Salvar alterações"}
                  </button>
                  <button
                    type="submit"
                    className="btn-secondary flex-1"
                    disabled={saving !== null}
                  >
                    {saving === "pdf" ? "Salvando…" : "Salvar e baixar PDF"}
                  </button>
                </>
              ) : (
                <>
                  <button type="submit" className="btn-primary flex-1" disabled={saving !== null}>
                    {saving === "pdf" ? "Gerando…" : "Gerar e baixar PDF"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary flex-1"
                    disabled={saving !== null}
                    onClick={() => void create("print")}
                  >
                    {saving === "print" ? "Gerando…" : "Gerar e imprimir"}
                  </button>
                </>
              )}
            </div>

            {lastCreated && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
                <p className="font-medium">
                  {kindLabel(lastCreated.kind)} de {lastCreated.patientName} salvo.
                </p>
                <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  <a className="underline underline-offset-2" href={pdfUrl(lastCreated.id)}>
                    Baixar PDF
                  </a>
                  <a
                    className="underline underline-offset-2"
                    href={printUrl(lastCreated.id)}
                    target="_blank"
                    rel="noopener"
                  >
                    Imprimir
                  </a>
                  {lastCreated.shareUrl && (
                    <button
                      type="button"
                      className="underline underline-offset-2"
                      onClick={() => void copyShare(lastCreated)}
                    >
                      Copiar link
                    </button>
                  )}
                </p>
              </div>
            )}
          </form>

          {!isEspecial && (
            <div className="surface p-5">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => {
                  setHeaderOpen((v) => !v);
                  setHeaderDraft(header);
                  setHeaderMsg("");
                }}
                aria-expanded={headerOpen}
              >
                <span>
                  <span className="block font-semibold tracking-tight">Dados do cabeçalho</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    Clínica, endereço, telefone e assinatura
                  </span>
                </span>
                <span className="text-sm text-muted">{headerOpen ? "Fechar" : "Editar"}</span>
              </button>

              {headerOpen && (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {HEADER_FIELDS.map((f) => (
                      <label
                        key={f.key}
                        className={`block text-sm ${f.wide ? "sm:col-span-2" : ""}`}
                      >
                        <span className="mb-1.5 block font-medium">{f.label}</span>
                        <input
                          className="input-field"
                          value={headerDraft[f.key]}
                          placeholder={f.placeholder}
                          onChange={(e) =>
                            setHeaderDraft((h) => ({ ...h, [f.key]: e.target.value }))
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted">
                    Documentos já emitidos mantêm o cabeçalho da época em que foram gerados.
                  </p>
                  {headerMsg && <p className="text-sm text-muted">{headerMsg}</p>}
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={headerSaving}
                    onClick={() => void saveHeader()}
                  >
                    {headerSaving ? "Salvando…" : "Salvar cabeçalho"}
                  </button>
                </div>
              )}
            </div>
          )}

          {isEspecial && (
            <p className="px-1 text-xs text-muted">
              O atestado especial usa o cabeçalho UPA. A assinatura é à caneta no espaço em branco.
            </p>
          )}
          {isComparecimento && null}
        </div>

        <div className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <p className="attendance-preview-label mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Prévia
          </p>
          <AttendancePreview header={previewHeader} data={previewData} />
        </div>
      </div>

      <section className="surface p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold tracking-tight">Histórico ({items.length})</h2>
            <p className="mt-0.5 text-xs text-muted">
              Documentos emitidos, da mais recente para a mais antiga
            </p>
          </div>
          <input
            className="input-field sm:max-w-xs"
            placeholder="Buscar por nome"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            {items.length === 0
              ? "Nenhum documento emitido ainda."
              : "Nenhum documento encontrado para essa busca."}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {filtered.map((it) => (
              <li
                key={it.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 truncate font-medium">
                    <span className="truncate">{it.patientName}</span>
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {kindLabel(it.kind)}
                    </span>
                  </p>
                  <p className="text-xs text-muted">
                    {it.kind === COMPARECIMENTO_KIND
                      ? `Atendimento em ${formatShortDate(it.visitDate)}, das ${formatTime(it.startTime)} às ${formatTime(it.endTime)} · emitido em ${formatShortDate(it.issueDate)}`
                      : `Emitido em ${formatShortDate(it.issueDate)}`}
                    {it.shareRevoked ? " · link revogado" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-secondary !py-1.5 text-xs"
                    onClick={() => startEdit(it)}
                  >
                    Editar
                  </button>
                  <a
                    className="btn-secondary !py-1.5 text-xs"
                    href={printUrl(it.id)}
                    target="_blank"
                    rel="noopener"
                  >
                    Imprimir
                  </a>
                  <a className="btn-secondary !py-1.5 text-xs" href={pdfUrl(it.id)}>
                    PDF
                  </a>
                  {it.shareUrl ? (
                    <button
                      type="button"
                      className="btn-secondary !py-1.5 text-xs"
                      onClick={() => void copyShare(it)}
                    >
                      Copiar link
                    </button>
                  ) : null}
                  {it.shareUrl ? (
                    <button
                      type="button"
                      className="btn-secondary !py-1.5 text-xs"
                      onClick={() => void shareAction(it, "revoke")}
                    >
                      Revogar link
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-secondary !py-1.5 text-xs"
                      onClick={() => void shareAction(it, "regenerate")}
                    >
                      Gerar link
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-secondary !py-1.5 text-xs"
                    onClick={() => reuse(it)}
                  >
                    Nova para este paciente
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
