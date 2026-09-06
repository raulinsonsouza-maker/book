"use client";

import { useEffect, useState } from "react";
import {
  PLATFORM_PLAN_FALLBACKS,
  PLATFORM_PLAN_SLUGS,
  type PlatformPlanSlug,
} from "@/lib/billing/plans-catalog";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { formatPhone } from "@/lib/utils";

type PlanCard = (typeof PLATFORM_PLAN_FALLBACKS)[number];

const PLAN_FEATURES = [
  "Link de agendamento com a sua marca",
  "Pix e cartão na hora da reserva",
  "Agenda e equipe no mesmo painel",
  "Lembretes por e-mail e WhatsApp",
  "600 mensagens WhatsApp por mês",
];

type Props = {
  accountName: string;
  email: string;
  phone: string;
  password: string;
  planSlug: string;
  onAccountNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onPlanChange: (slug: PlatformPlanSlug) => void;
  onClearError: () => void;
};

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function ContaStep({
  accountName,
  email,
  phone,
  password,
  planSlug,
  onAccountNameChange,
  onEmailChange,
  onPhoneChange,
  onPasswordChange,
  onPlanChange,
  onClearError,
}: Props) {
  const [plans, setPlans] = useState<PlanCard[]>(PLATFORM_PLAN_FALLBACKS);

  useEffect(() => {
    fetch("/api/billing/plans")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.plans) && d.plans.length) setPlans(d.plans);
      })
      .catch(() => undefined);
  }, []);

  const semester = plans.find((p) => p.slug === PLATFORM_PLAN_SLUGS.semester);
  const monthly = plans.find((p) => p.slug === PLATFORM_PLAN_SLUGS.monthly);

  return (
    <div className="space-y-7">
      <div>
        <h1 className="onboard-title text-2xl sm:text-[1.85rem]">
          Sua agenda online por{" "}
          <span className="font-accent text-[var(--lp-accent)]">R$&nbsp;67</span>
          /mês
        </h1>
        <p className="onboard-lead mt-2">
          Link com a sua marca, pagamentos na reserva e lembretes automáticos.
          Crie a conta e libere no pagamento.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Mensal */}
        {monthly && (
          <button
            type="button"
            onClick={() => {
              onPlanChange(monthly.slug as PlatformPlanSlug);
              onClearError();
            }}
            className={`onboard-plan-card text-left ${
              planSlug === monthly.slug ? "is-active" : ""
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--lp-steel)]">
              Mensal
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight">
              {formatBRL(monthly.priceCents)}
              <span className="text-sm font-semibold text-[var(--lp-steel)]">
                /mês
              </span>
            </p>
            <p className="mt-2 text-xs text-[var(--lp-steel)]">
              Cobrança todo mês · cancele quando quiser
            </p>
          </button>
        )}

        {/* Semestral — foco em R$67 */}
        {semester && (
          <button
            type="button"
            onClick={() => {
              onPlanChange(semester.slug as PlatformPlanSlug);
              onClearError();
            }}
            className={`onboard-plan-card text-left is-highlight ${
              planSlug === semester.slug ? "is-active" : ""
            }`}
          >
            <span className="onboard-plan-badge">Economize 31%</span>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--lp-steel)]">
              Semestral
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight">
              R$ 67
              <span className="text-sm font-semibold text-[var(--lp-steel)]">
                /mês
              </span>
            </p>
            <p className="mt-1 text-xs text-[var(--lp-steel)]">
              <span className="line-through">{formatBRL(58200)}</span>
              {" → "}
              <strong className="text-[var(--lp-ink)]">
                {formatBRL(semester.priceCents)}
              </strong>{" "}
              no semestre
            </p>
            <p className="mt-2 text-xs font-medium text-[var(--lp-accent)]">
              Em até 6x no cartão
            </p>
          </button>
        )}
      </div>

      <ul className="onboard-plan-features">
        {PLAN_FEATURES.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>

      <div className="space-y-3 border-t border-[rgba(12,18,34,0.08)] pt-5">
        <p className="text-sm font-semibold">Sua conta</p>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Seu nome</span>
          <input
            className="input-field"
            value={accountName}
            onChange={(e) => {
              onAccountNameChange(e.target.value);
              onClearError();
            }}
            placeholder="Como devemos te chamar"
            autoComplete="name"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">E-mail</span>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => {
                onEmailChange(e.target.value);
                onClearError();
              }}
              placeholder="voce@email.com"
              autoComplete="email"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">WhatsApp</span>
            <input
              type="tel"
              inputMode="numeric"
              className="input-field"
              value={phone || ""}
              onChange={(e) => {
                onPhoneChange(formatPhone(e.target.value));
                onClearError();
              }}
              placeholder="(11) 99999-9999"
              autoComplete="tel"
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Senha (mín. 6)</span>
          <PasswordInput
            className="input-field"
            value={password}
            minLength={6}
            onChange={(e) => {
              onPasswordChange(e.target.value);
              onClearError();
            }}
          />
        </label>
      </div>
    </div>
  );
}
