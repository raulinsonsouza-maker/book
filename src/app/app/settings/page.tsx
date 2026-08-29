"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DESCRIPTION_MAX } from "@/lib/branding";

type Org = {
  name: string;
  description: string | null;
  logoUrl: string | null;
  accentColor: string;
  businessMode: "SOLO" | "SALON";
  notifyClientConfirmation: boolean;
  notifyClientReminder: boolean;
  notifyClientFeedback: boolean;
  notifyProNewBooking: boolean;
  notifyProCancellation: boolean;
  notifyProReschedule: boolean;
  reminderHoursBefore: number;
  cardMaxInstallments: number;
};

const MAX_LOGO_BYTES = 350_000;

export default function SettingsPage() {
  const [org, setOrg] = useState<Org | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [accentColor, setAccentColor] = useState("#0a0a0a");
  const [comms, setComms] = useState({
    notifyClientConfirmation: true,
    notifyClientReminder: true,
    notifyClientFeedback: false,
    notifyProNewBooking: true,
    notifyProCancellation: false,
    notifyProReschedule: false,
    reminderHoursBefore: 24,
  });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingComms, setSavingComms] = useState(false);
  const [savingMode, setSavingMode] = useState(false);
  const [businessMode, setBusinessMode] = useState<"SOLO" | "SALON">("SOLO");
  const [cardMaxInstallments, setCardMaxInstallments] = useState(12);
  const [savingInstallments, setSavingInstallments] = useState(false);

  useEffect(() => {
    fetch("/api/organization")
      .then((r) => r.json())
      .then((data: Org) => {
        setOrg(data);
        setName(data.name);
        setDescription(data.description || "");
        setLogoUrl(data.logoUrl || "");
        setAccentColor(data.accentColor || "#0a0a0a");
        setBusinessMode(data.businessMode || "SOLO");
        setCardMaxInstallments(data.cardMaxInstallments || 12);
        setComms({
          notifyClientConfirmation: data.notifyClientConfirmation,
          notifyClientReminder: data.notifyClientReminder,
          notifyClientFeedback: data.notifyClientFeedback,
          notifyProNewBooking: data.notifyProNewBooking,
          notifyProCancellation: data.notifyProCancellation,
          notifyProReschedule: data.notifyProReschedule,
          reminderHoursBefore: data.reminderHoursBefore,
        });
      });
  }, []);

  async function saveInstallments(e: React.FormEvent) {
    e.preventDefault();
    setSavingInstallments(true);
    setError("");
    const res = await fetch("/api/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardMaxInstallments }),
    });
    const data = await res.json();
    setSavingInstallments(false);
    if (!res.ok) {
      setError(data.error || "Não foi possível salvar parcelas");
      return;
    }
    setCardMaxInstallments(data.cardMaxInstallments);
    setMsg(
      data.cardMaxInstallments === 1
        ? "Cartão só à vista"
        : `Máximo de ${data.cardMaxInstallments}x no cartão`,
    );
    setTimeout(() => setMsg(""), 2500);
  }

  async function saveMode(next: "SOLO" | "SALON") {
    setSavingMode(true);
    setError("");
    const res = await fetch("/api/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessMode: next }),
    });
    const data = await res.json();
    setSavingMode(false);
    if (!res.ok) {
      setError(data.error || "Não foi possível alterar o modo");
      return;
    }
    setBusinessMode(data.businessMode);
    setOrg(data);
    setSavingMode(false);
    // Recarrega o shell (sidebar muda entre Individual/Salão)
    window.location.assign(
      data.businessMode === "SALON" ? "/app/professionals" : "/app",
    );
  }
  function onLogoFile(file: File | null) {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Envie uma imagem (PNG, JPG ou WebP)");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError("Logo muito grande — use até ~350 KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      setLogoUrl(result);
    };
    reader.readAsDataURL(file);
  }

  async function saveOrg(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description.trim() || null,
        logoUrl: logoUrl.trim() || null,
        accentColor,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Não foi possível salvar");
      return;
    }
    setOrg(data);
    setMsg("Identidade salva — painel, checkout e agendamento usam esses dados");
    setTimeout(() => setMsg(""), 3500);
  }

  async function saveComms(e: React.FormEvent) {
    e.preventDefault();
    setSavingComms(true);
    const res = await fetch("/api/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(comms),
    });
    const data = await res.json();
    setSavingComms(false);
    if (!res.ok) {
      setError(data.error || "Não foi possível salvar comunicação");
      return;
    }
    setOrg(data);
    setMsg("Comunicação salva");
    setTimeout(() => setMsg(""), 2000);
  }

  if (!org) return <p className="text-sm text-muted">Carregando…</p>;

  const previewName = name.trim() || "Sua empresa";
  const previewDesc = description.trim().slice(0, DESCRIPTION_MAX);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {msg && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {msg}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <p className="text-sm text-muted">
        Identidade da empresa usada no painel, no checkout e no agendamento. Integrações em{" "}
        <Link href="/app/integrations" className="font-medium text-foreground underline-offset-2 hover:underline">
          Integrações
        </Link>
        .
      </p>

      <section className="surface space-y-4 p-6">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Modo de operação</h2>
          <p className="mt-1 text-xs text-muted">
            Individual = um calendário por página de serviços. Salão = vários profissionais com
            login e páginas próprias.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={savingMode || businessMode === "SOLO"}
            onClick={() => saveMode("SOLO")}
            className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
              businessMode === "SOLO"
                ? "border-foreground bg-foreground text-white"
                : "border-border bg-white hover:bg-muted-bg"
            }`}
          >
            <p className="font-semibold">Individual</p>
            <p className={`mt-1 text-xs ${businessMode === "SOLO" ? "text-white/80" : "text-muted"}`}>
              Consultoria / profissional único
            </p>
          </button>
          <button
            type="button"
            disabled={savingMode || businessMode === "SALON"}
            onClick={() => saveMode("SALON")}
            className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
              businessMode === "SALON"
                ? "border-foreground bg-foreground text-white"
                : "border-border bg-white hover:bg-muted-bg"
            }`}
          >
            <p className="font-semibold">Salão</p>
            <p className={`mt-1 text-xs ${businessMode === "SALON" ? "text-white/80" : "text-muted"}`}>
              Equipe, serviços cruzados, funil com escolha de profissional
            </p>
          </button>
        </div>
        {businessMode === "SALON" && (
          <p className="text-xs text-muted">
            Em seguida, cadastre a equipe em{" "}
            <Link href="/app/professionals" className="font-medium text-foreground underline">
              Profissionais
            </Link>
            .
          </p>
        )}
      </section>

      <form onSubmit={saveInstallments} className="surface space-y-4 p-6">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            Parcelas no cartão
          </h2>
          <p className="mt-1 text-xs text-muted">
            Limite que o cliente vê no funil e no checkout (Mercado Pago e Asaas).
            Juros e regras finas continuam na conta do provedor.
          </p>
        </div>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Máximo de parcelas</span>
          <select
            className="input-field max-w-xs"
            value={cardMaxInstallments}
            onChange={(e) =>
              setCardMaxInstallments(Number(e.target.value) || 1)
            }
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 1 ? "1x — só à vista" : `Até ${n}x`}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={savingInstallments}
          className="btn-primary"
        >
          {savingInstallments ? "Salvando…" : "Salvar parcelas"}
        </button>
      </form>

      <form onSubmit={saveOrg} className="surface space-y-5 p-6">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Identidade visual</h2>
          <p className="mt-1 text-xs text-muted">
            Uma vez configurada, o sistema herda logo, nome e cor automaticamente.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-[#f7f5f2] p-4">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted">
            Prévia no checkout
          </p>
          <div className="rounded-2xl border border-border bg-white px-5 py-6 text-center shadow-sm">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="mx-auto mb-3 h-12 object-contain" />
            ) : (
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-black/5 text-xs text-muted">
                Logo
              </div>
            )}
            <p className="text-lg font-semibold tracking-tight">{previewName}</p>
            {previewDesc && <p className="mt-1 text-sm text-muted">{previewDesc}</p>}
            <button
              type="button"
              className="mt-4 rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ background: accentColor }}
            >
              Continuar
            </button>
          </div>
        </div>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Nome da empresa</span>
          <input
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 flex items-center justify-between font-medium">
            Descrição curta
            <span className="text-xs font-normal text-muted">
              {description.length}/{DESCRIPTION_MAX}
            </span>
          </span>
          <textarea
            className="input-field min-h-[88px] resize-y"
            value={description}
            maxLength={DESCRIPTION_MAX}
            placeholder="Ex.: Consultoria jurídica para abertura de empresas"
            onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
          />
        </label>

        <div className="space-y-2">
          <span className="block text-sm font-medium">Logo</span>
          <div className="flex flex-wrap items-center gap-3">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="h-12 w-12 rounded-lg border border-border bg-white object-contain p-1"
              />
            )}
            <label className="btn-secondary cursor-pointer !py-2 text-sm">
              Enviar arquivo
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => onLogoFile(e.target.files?.[0] || null)}
              />
            </label>
            {logoUrl && (
              <button
                type="button"
                className="text-sm text-danger"
                onClick={() => setLogoUrl("")}
              >
                Remover
              </button>
            )}
          </div>
          <p className="text-xs text-muted">PNG, JPG ou WebP até ~350 KB.</p>
        </div>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Cor principal</span>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded border border-border bg-white p-1"
            />
            <input
              className="input-field font-mono text-sm uppercase"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              pattern="^#[0-9A-Fa-f]{6}$"
            />
          </div>
          <p className="mt-1 text-xs text-muted">
            Usada em botões e destaques do checkout e do agendamento.
          </p>
        </label>

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Salvando…" : "Salvar identidade"}
        </button>
      </form>

      <form onSubmit={saveComms} className="surface space-y-5 p-6">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Comunicação do Agendamento</h2>
          <p className="mt-1 text-xs text-muted">
            E-mails com identidade Book Symbius. O Google Calendar cuida dos lembretes do profissional.
          </p>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold uppercase tracking-wide text-muted">Cliente</legend>
          {(
            [
              ["notifyClientConfirmation", "Enviar confirmação de agendamento"],
              ["notifyClientReminder", "Enviar lembrete antes do agendamento"],
              ["notifyClientFeedback", "Solicitar avaliação após atendimento"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={comms[key]}
                onChange={(e) => setComms((c) => ({ ...c, [key]: e.target.checked }))}
              />
              {label}
            </label>
          ))}
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold uppercase tracking-wide text-muted">
            Profissional
          </legend>
          {(
            [
              ["notifyProNewBooking", "Notificar novo agendamento confirmado"],
              ["notifyProCancellation", "Notificar cancelamento"],
              ["notifyProReschedule", "Notificar reagendamento"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={comms[key]}
                onChange={(e) => setComms((c) => ({ ...c, [key]: e.target.checked }))}
              />
              {label}
            </label>
          ))}
        </fieldset>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Lembrete antes do atendimento</span>
          <select
            className="input-field"
            value={comms.reminderHoursBefore}
            onChange={(e) =>
              setComms((c) => ({
                ...c,
                reminderHoursBefore: Number(e.target.value),
              }))
            }
          >
            <option value={24}>24 horas</option>
            <option value={12}>12 horas</option>
            <option value={2}>2 horas</option>
            <option value={0}>Não enviar</option>
          </select>
        </label>

        <button type="submit" disabled={savingComms} className="btn-primary">
          {savingComms ? "Salvando…" : "Salvar comunicação"}
        </button>
      </form>
    </div>
  );
}
