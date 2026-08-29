"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Org = {
  name: string;
  notifyClientConfirmation: boolean;
  notifyClientReminder: boolean;
  notifyClientFeedback: boolean;
  notifyProNewBooking: boolean;
  notifyProCancellation: boolean;
  notifyProReschedule: boolean;
  reminderHoursBefore: number;
};

export default function SettingsPage() {
  const [org, setOrg] = useState<Org | null>(null);
  const [name, setName] = useState("");
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
  const [saving, setSaving] = useState(false);
  const [savingComms, setSavingComms] = useState(false);

  useEffect(() => {
    fetch("/api/organization")
      .then((r) => r.json())
      .then((data: Org) => {
        setOrg(data);
        setName(data.name);
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

  async function saveOrg(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setOrg(await res.json());
    setSaving(false);
    setMsg("Dados salvos");
    setTimeout(() => setMsg(""), 2000);
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
      setMsg(data.error || "Não foi possível salvar comunicação");
      return;
    }
    setOrg(data);
    setMsg("Comunicação salva");
    setTimeout(() => setMsg(""), 2000);
  }

  if (!org) return <p className="text-sm text-muted">Carregando…</p>;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {msg && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {msg}
        </p>
      )}

      <p className="text-sm text-muted">
        Dados da sua empresa. Integrações ficam em{" "}
        <Link href="/app/integrations" className="font-medium text-foreground underline-offset-2 hover:underline">
          Integrações
        </Link>
        .
      </p>

      <form onSubmit={saveOrg} className="surface space-y-4 p-6">
        <h2 className="text-sm font-semibold tracking-tight">Empresa</h2>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Nome</span>
          <input
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Salvando…" : "Salvar empresa"}
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
