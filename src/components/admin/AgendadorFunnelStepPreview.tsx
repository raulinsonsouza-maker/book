"use client";

import { useState } from "react";
import { format, addDays, startOfToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AgendadorEditableServiceCard } from "@/components/admin/AgendadorEditableServiceCard";
import { FunnelLandingBlocks } from "@/components/booking/FunnelLandingBlocks";
import { formatBRL } from "@/lib/utils";
import type { FunnelBlock, FormFieldConfig } from "@/types/funnel-config";

export type FunnelPreviewStep =
  | "welcome"
  | "service"
  | "professional"
  | "datetime"
  | "details"
  | "payment"
  | "done";

export type PreviewService = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  durationMinutes: number;
  priceCents: number;
  isActive: boolean;
};

export type PreviewProfessional = {
  id: string;
  displayName: string;
  photoUrl: string | null;
};

type Props = {
  step: FunnelPreviewStep;
  accent: string;
  logoUrl: string | null;
  title: string;
  description: string;
  services: PreviewService[];
  professionals: PreviewProfessional[];
  blocks: FunnelBlock[];
  formFields: FormFieldConfig[];
  demoPayments: boolean;
  businessMode: "SOLO" | "SALON";
  selectedService: PreviewService | null;
  canGoBack: boolean;
  onGoBack: () => void;
  onPickService: (service: PreviewService) => void;
  onPickProfessional: () => void;
  onPickSlot: () => void;
  onConfirmDetails: () => void;
  onConfirmPayment: () => void;
  onRestart: () => void;
  onServiceChange: (id: string, patch: Partial<PreviewService>) => void;
  onServiceImageFile: (id: string, file: File | null) => void;
};

const SAMPLE_SLOTS = ["09:00", "09:30", "10:00", "14:00", "15:30", "17:00"];

function PreviewHeader({
  accent,
  logoUrl,
  title,
  stepLabel,
  stepIndex,
  stepTotal,
  showProgress,
}: {
  accent: string;
  logoUrl: string | null;
  title: string;
  stepLabel: string;
  stepIndex: number;
  stepTotal: number;
  showProgress: boolean;
}) {
  const initials = title.slice(0, 2).toUpperCase();
  const progress = Math.round(((stepIndex + 1) / Math.max(stepTotal, 1)) * 100);

  return (
    <div className="border-b border-black/5 bg-white">
      <div className="flex items-center gap-3 px-4 py-3">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="h-9 max-w-[7.5rem] object-contain"
          />
        ) : (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white"
            style={{ background: accent }}
          >
            {initials}
          </div>
        )}
        <p className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight">
          {title}
        </p>
        {showProgress && (
          <p className="shrink-0 rounded-full bg-black/[0.04] px-2.5 py-1 text-[11px] font-medium text-muted">
            {stepIndex + 1}/{stepTotal}
          </p>
        )}
      </div>
      {showProgress && (
        <div className="px-4 pb-3">
          <p className="mb-1.5 text-xs font-medium text-foreground">{stepLabel}</p>
          <div className="booking-progress" aria-hidden>
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

export function AgendadorFunnelStepPreview({
  step,
  accent,
  logoUrl,
  title,
  description,
  services,
  professionals,
  blocks,
  formFields,
  demoPayments,
  businessMode,
  selectedService,
  canGoBack,
  onGoBack,
  onPickService,
  onPickProfessional,
  onPickSlot,
  onConfirmDetails,
  onConfirmPayment,
  onRestart,
  onServiceChange,
  onServiceImageFile,
}: Props) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState(SAMPLE_SLOTS[0]);

  const activeServices = services.filter((s) => s.isActive);
  const fallbackService: PreviewService = {
    id: "sample",
    title: "Seu serviço",
    description: "Cadastre em Serviços para ver aqui",
    imageUrl: null,
    durationMinutes: 30,
    priceCents: 5000,
    isActive: true,
  };
  const service = selectedService ?? activeServices[0] ?? fallbackService;
  const samplePro = professionals[0];
  const sampleDate = addDays(startOfToday(), selectedDayIndex);
  const whenLabel = `${format(sampleDate, "EEE, d MMM", { locale: ptBR })} · ${selectedSlot}`;
  const fields = [...formFields]
    .filter((f) => f.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const progressTotal = demoPayments ? 4 : 5;
  const progressIndex =
    step === "service"
      ? 0
      : step === "professional"
        ? 1
        : step === "datetime"
          ? businessMode === "SALON"
            ? 2
            : 1
          : step === "details"
            ? demoPayments
              ? 2
              : 3
            : step === "payment"
              ? 3
              : 0;

  const shell = (children: React.ReactNode, header: React.ReactNode) => (
    <div className="booking-shell" style={{ "--accent": accent } as React.CSSProperties}>
      {header}
      <div className="px-4 py-4">
        {canGoBack && (
          <button
            type="button"
            onClick={onGoBack}
            className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted transition hover:text-foreground"
          >
            ← Voltar
          </button>
        )}
        {children}
      </div>
    </div>
  );

  if (step === "service") {
    return shell(
      <>
        <div>
          <h1 className="text-[1.35rem] font-bold leading-tight tracking-tight">
            Escolha o atendimento
          </h1>
          <p className="mt-2 text-sm text-muted">
            {description.trim() ||
              "Selecione o serviço para ver os horários disponíveis"}
          </p>
        </div>
        {blocks.length > 0 && (
          <div className="booking-card mt-4 p-4">
            <FunnelLandingBlocks blocks={blocks} />
          </div>
        )}
        <div className="mt-4 space-y-3">
          {(activeServices.length ? activeServices : [fallbackService]).map((s) =>
            s.id === "sample" ? (
              <button
                key={s.id}
                type="button"
                onClick={() => onPickService(s)}
                className="booking-service group w-full"
              >
                <div className="flex items-center gap-3">
                  <div className="booking-service-thumb">
                    <span aria-hidden>?</span>
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-base font-semibold tracking-tight">{s.title}</p>
                    <p className="mt-0.5 text-sm text-muted">{s.description}</p>
                  </div>
                </div>
              </button>
            ) : (
              <AgendadorEditableServiceCard
                key={s.id}
                service={s}
                accent={accent}
                onChange={(patch) => onServiceChange(s.id, patch)}
                onImageFile={(file) => onServiceImageFile(s.id, file)}
                onPick={() => onPickService(s)}
              />
            ),
          )}
        </div>
      </>,
      <PreviewHeader
        accent={accent}
        logoUrl={logoUrl}
        title={title}
        stepLabel="Serviço"
        stepIndex={progressIndex}
        stepTotal={progressTotal}
        showProgress
      />,
    );
  }

  if (step === "professional") {
    return shell(
      <>
        <div>
          <h1 className="text-[1.35rem] font-bold leading-tight tracking-tight">
            Com quem você prefere?
          </h1>
          <p className="mt-2 text-sm text-muted">
            {service.title} · escolha o profissional ou qualquer disponível
          </p>
        </div>
        <div className="mt-4 space-y-3">
          <button
            type="button"
            onClick={onPickProfessional}
            className="booking-service group w-full"
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
                style={{ background: accent }}
              >
                ?
              </span>
              <div className="min-w-0 flex-1 text-left">
                <p className="font-semibold tracking-tight">Qualquer disponível</p>
                <p className="text-sm text-muted">Primeiro horário livre entre a equipe</p>
              </div>
              <span className="text-muted">→</span>
            </div>
          </button>
          {(professionals.length ? professionals : samplePro ? [samplePro] : []).map(
            (pro) => (
              <button
                key={pro.id}
                type="button"
                onClick={onPickProfessional}
                className="booking-service group w-full"
              >
                <div className="flex items-center gap-3">
                  {pro.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pro.photoUrl}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ background: accent }}
                    >
                      {pro.displayName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <p className="min-w-0 flex-1 text-left font-semibold tracking-tight">
                    {pro.displayName}
                  </p>
                  <span className="text-muted">→</span>
                </div>
              </button>
            ),
          )}
          {professionals.length === 0 && !samplePro && (
            <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
              Cadastre profissionais em Equipe
            </p>
          )}
        </div>
      </>,
      <PreviewHeader
        accent={accent}
        logoUrl={logoUrl}
        title={title}
        stepLabel="Profissional"
        stepIndex={progressIndex}
        stepTotal={progressTotal}
        showProgress
      />,
    );
  }

  if (step === "datetime") {
    const weekDays = [0, 1, 2, 3, 4].map((i) => addDays(startOfToday(), i));
    return shell(
      <div className="space-y-5">
        <div>
          <h1 className="text-[1.35rem] font-bold leading-tight tracking-tight">
            Escolha o dia e o horário
          </h1>
          <p className="mt-2 text-sm text-muted">
            {description.trim() || service.description || "Horários conforme sua agenda"}
          </p>
        </div>
        <div className="booking-card px-4 py-3.5">
          <p className="text-sm font-semibold tracking-tight">{service.title}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <span className="tag">{service.durationMinutes} min</span>
            <span
              className="rounded-md px-2 py-0.5 text-xs font-bold text-white"
              style={{ background: accent }}
            >
              {formatBRL(service.priceCents)}
            </span>
          </div>
        </div>
        <div className="booking-card overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold tracking-tight">Próximos dias</p>
          </div>
          <div className="-mx-0 flex gap-2 overflow-x-auto px-4 py-4">
            {weekDays.map((d, i) => (
              <button
                key={format(d, "yyyy-MM-dd")}
                type="button"
                onClick={() => setSelectedDayIndex(i)}
                className={`booking-day ${selectedDayIndex === i ? "booking-day-selected" : ""}`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                  {format(d, "EEE", { locale: ptBR })}
                </span>
                <span className="text-lg font-bold leading-none">{format(d, "d")}</span>
                <span className="text-[10px] font-medium capitalize opacity-80">
                  {format(d, "MMM", { locale: ptBR })}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="booking-card p-4">
          <p className="text-sm font-semibold capitalize tracking-tight">
            {format(sampleDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {SAMPLE_SLOTS.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => {
                  setSelectedSlot(slot);
                  onPickSlot();
                }}
                className={`booking-slot text-center ${selectedSlot === slot ? "booking-slot-selected" : ""}`}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      </div>,
      <PreviewHeader
        accent={accent}
        logoUrl={logoUrl}
        title={title}
        stepLabel="Horário"
        stepIndex={progressIndex}
        stepTotal={progressTotal}
        showProgress
      />,
    );
  }

  if (step === "details") {
    return shell(
      <div className="space-y-5">
        <div>
          <h1 className="text-[1.35rem] font-bold leading-tight tracking-tight">
            Quase lá
          </h1>
          <p className="mt-2 text-sm text-muted">
            Seus dados para confirmar e enviar o comprovante
          </p>
        </div>
        <div className="booking-card flex items-center justify-between gap-3 px-4 py-3.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{service.title}</p>
            <p className="mt-0.5 truncate text-xs capitalize text-muted">{whenLabel}</p>
          </div>
          <p className="shrink-0 text-sm font-bold" style={{ color: accent }}>
            {formatBRL(service.priceCents)}
          </p>
        </div>
        <div className="booking-card space-y-4 p-4">
          <div className="grid gap-3.5 sm:grid-cols-2">
            {fields.map((f) => (
              <label key={f.id} className="block text-sm">
                <span className="mb-1.5 block font-medium">
                  {f.label}
                  {!f.required ? " (opcional)" : ""}
                </span>
                <div className="input-field pointer-events-none bg-muted-bg/40 text-muted">
                  …
                </div>
              </label>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onConfirmDetails}
          className="btn-primary w-full !rounded-2xl !py-3.5 text-base"
        >
          {demoPayments ? "Confirmar agendamento" : "Continuar para pagamento"}
        </button>
      </div>,
      <PreviewHeader
        accent={accent}
        logoUrl={logoUrl}
        title={title}
        stepLabel="Dados"
        stepIndex={progressIndex}
        stepTotal={progressTotal}
        showProgress
      />,
    );
  }

  if (step === "payment") {
    return shell(
      <div className="space-y-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-[1.35rem] font-bold leading-tight tracking-tight">
              Pagamento
            </h1>
            <p className="mt-2 text-sm text-muted">Seguro · Pix ou cartão</p>
          </div>
          <p className="text-2xl font-bold tracking-tight" style={{ color: accent }}>
            {formatBRL(service.priceCents)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <span
            className="rounded-2xl px-3 py-3.5 text-center text-sm font-semibold text-white"
            style={{ background: accent }}
          >
            Pix
          </span>
          <span className="rounded-2xl border border-border bg-white px-3 py-3.5 text-center text-sm font-semibold">
            Cartão
          </span>
        </div>
        <div className="booking-card space-y-3 p-4">
          <p className="text-center text-sm font-medium">QR Code Pix (exemplo)</p>
          <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-xl border border-dashed border-border bg-muted-bg/50 text-xs text-muted">
            Prévia
          </div>
          <button
            type="button"
            onClick={onConfirmPayment}
            className="btn-primary w-full !rounded-2xl !py-3.5"
          >
            Simular pagamento confirmado
          </button>
        </div>
      </div>,
      <PreviewHeader
        accent={accent}
        logoUrl={logoUrl}
        title={title}
        stepLabel="Pagamento"
        stepIndex={progressIndex}
        stepTotal={progressTotal}
        showProgress
      />,
    );
  }

  if (step === "done") {
    return (
      <div className="booking-shell" style={{ "--accent": accent } as React.CSSProperties}>
        <PreviewHeader
          accent={accent}
          logoUrl={logoUrl}
          title={title}
          stepLabel="Confirmado"
          stepIndex={0}
          stepTotal={1}
          showProgress={false}
        />
        <div className="space-y-5 px-4 py-8 text-center">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl text-white shadow-lg"
            style={{
              background: accent,
              boxShadow: `0 12px 28px color-mix(in srgb, ${accent} 35%, transparent)`,
            }}
          >
            ✓
          </div>
          <div>
            <h1 className="text-[1.5rem] font-bold tracking-tight">Agendado!</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
              Confirmação enviada por e-mail · link para remarcar
            </p>
          </div>
          <div className="booking-card mx-auto max-w-sm p-5 text-left text-sm">
            <p className="font-semibold tracking-tight">{service.title}</p>
            <p className="mt-1 capitalize text-muted">{whenLabel}</p>
            <p className="mt-3 text-base font-bold" style={{ color: accent }}>
              {formatBRL(service.priceCents)}
            </p>
          </div>
          <button
            type="button"
            onClick={onRestart}
            className="text-sm font-medium text-muted underline-offset-2 hover:text-foreground hover:underline"
          >
            ← Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  return null;
}
