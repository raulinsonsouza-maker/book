"use client";

import { useMemo, useState } from "react";
import { AttendancePreview } from "@/components/documents/AttendanceDocument";
import {
  formatShortDate,
  formatTime,
  todayIsoDate,
  type AttendanceHeader,
} from "@/lib/attendance/format";
import type { AttendanceCertificateDTO } from "@/lib/attendance/serialize";

type Props = {
  initialHeader: AttendanceHeader;
  initialItems: AttendanceCertificateDTO[];
};

type FormState = {
  patientName: string;
  visitDate: string;
  startTime: string;
  endTime: string;
  issueDate: string;
};

const HEADER_FIELDS: { key: keyof AttendanceHeader; label: string; placeholder?: string; wide?: boolean }[] = [
  { key: "businessName", label: "Nome da clínica", wide: true },
  { key: "address", label: "Endereço", wide: true },
  { key: "phone", label: "Telefone / WhatsApp", placeholder: "(19) 99999-9999" },
  { key: "cnpj", label: "CNPJ (opcional)", placeholder: "Deixe vazio se não houver" },
  { key: "city", label: "Cidade da emissão", placeholder: "Piracicaba/SP" },
  { key: "signerName", label: "Nome de quem assina" },
  { key: "signerTitle", label: "Linha abaixo do nome", placeholder: "Usa o nome da clínica se vazio" },
  { key: "signerPhone", label: "Telefone na assinatura", placeholder: "Usa o telefone do cabeçalho se vazio" },
];

function emptyForm(): FormState {
  const today = todayIsoDate();
  return { patientName: "", visitDate: today, startTime: "", endTime: "", issueDate: today };
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

export function DeclaracoesView({ initialHeader, initialItems }: Props) {
  const [header, setHeader] = useState(initialHeader);
  const [headerDraft, setHeaderDraft] = useState(initialHeader);
  const [headerOpen, setHeaderOpen] = useState(false);
  const [headerSaving, setHeaderSaving] = useState(false);
  const [headerMsg, setHeaderMsg] = useState("");

  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState<"pdf" | "print" | null>(null);
  const [error, setError] = useState("");
  const [lastCreated, setLastCreated] = useState<AttendanceCertificateDTO | null>(null);

  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");

  const previewHeader = headerOpen ? headerDraft : header;
  const previewData = { ...form, issueCity: previewHeader.city };

  const filtered = useMemo(() => {
    const q = search
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (!q) return items;
    return items.filter((it) =>
      it.patientName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .includes(q),
    );
  }, [items, search]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setError("");
  }

  function validate() {
    if (form.patientName.trim().length < 3) return "Informe o nome completo do paciente";
    if (!form.visitDate) return "Informe a data do atendimento";
    if (!form.startTime || !form.endTime) return "Informe os horários de entrada e saída";
    if (form.endTime <= form.startTime) return "O horário de saída precisa ser depois da entrada";
    if (!form.issueDate) return "Informe a data de emissão";
    return "";
  }

  async function create(mode: "pdf" | "print") {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    // Abre a aba antes do await para o navegador não bloquear o pop-up.
    const printWindow = mode === "print" ? window.open("about:blank", "_blank") : null;
    setSaving(mode);
    setError("");
    const res = await fetch("/api/declaracoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(null);
    if (!res.ok || !data.item) {
      printWindow?.close();
      setError(data.error || "Não foi possível gerar a declaração");
      return;
    }
    const item = data.item as AttendanceCertificateDTO;
    setItems((prev) => [item, ...prev]);
    setLastCreated(item);
    setForm((f) => ({ ...emptyForm(), visitDate: f.visitDate, issueDate: f.issueDate }));
    if (mode === "pdf") {
      triggerDownload(pdfUrl(item.id));
    } else if (printWindow) {
      printWindow.location.href = printUrl(item.id);
    } else {
      window.open(printUrl(item.id), "_blank");
    }
  }

  function reuse(item: AttendanceCertificateDTO) {
    setForm({
      patientName: item.patientName,
      visitDate: todayIsoDate(),
      startTime: item.startTime,
      endTime: item.endTime,
      issueDate: todayIsoDate(),
    });
    setLastCreated(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      <p className="text-sm text-muted">
        Preencha os dados do atendimento e gere a declaração no timbre da clínica. Tudo o que
        for emitido fica salvo no histórico abaixo.
      </p>

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
              <h2 className="font-semibold tracking-tight">Nova declaração</h2>
              <p className="mt-0.5 text-xs text-muted">Declaração de comparecimento</p>
            </div>

            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Nome completo do paciente</span>
              <input
                className="input-field"
                value={form.patientName}
                onChange={(e) => update("patientName", e.target.value)}
                placeholder="Ex.: Maria da Silva Souza"
                autoComplete="off"
                maxLength={160}
              />
            </label>

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

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
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
            </div>

            {lastCreated && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
                <p className="font-medium">Declaração de {lastCreated.patientName} salva.</p>
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
                </p>
              </div>
            )}
          </form>

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
                    <label key={f.key} className={`block text-sm ${f.wide ? "sm:col-span-2" : ""}`}>
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
                  Declarações já emitidas mantêm o cabeçalho da época em que foram geradas.
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
        </div>

        <div className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Prévia</p>
          <AttendancePreview header={previewHeader} data={previewData} />
        </div>
      </div>

      <section className="surface p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold tracking-tight">Histórico ({items.length})</h2>
            <p className="mt-0.5 text-xs text-muted">Declarações emitidas, da mais recente para a mais antiga</p>
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
              ? "Nenhuma declaração emitida ainda."
              : "Nenhuma declaração encontrada para essa busca."}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {filtered.map((it) => (
              <li
                key={it.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{it.patientName}</p>
                  <p className="text-xs text-muted">
                    Atendimento em {formatShortDate(it.visitDate)}, das {formatTime(it.startTime)} às{" "}
                    {formatTime(it.endTime)} · emitida em {formatShortDate(it.issueDate)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    className="btn-secondary !py-1.5 text-xs"
                    href={printUrl(it.id)}
                    target="_blank"
                    rel="noopener"
                  >
                    Imprimir
                  </a>
                  <a className="btn-secondary !py-1.5 text-xs" href={pdfUrl(it.id)}>
                    Baixar PDF
                  </a>
                  <button
                    type="button"
                    className="btn-secondary !py-1.5 text-xs"
                    onClick={() => reuse(it)}
                    title="Preenche o formulário com este paciente"
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
