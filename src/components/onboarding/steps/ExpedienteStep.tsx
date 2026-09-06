"use client";

import { WeekHoursSimple } from "@/components/availability/WeekHoursSimple";
import type { AvailabilityRuleDraft } from "../types";

type Props = {
  rules: AvailabilityRuleDraft[];
  onChange: (rules: AvailabilityRuleDraft[]) => void;
};

export function ExpedienteStep({ rules, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="onboard-title text-2xl sm:text-[1.85rem]">
          Horário de funcionamento
        </h1>
        <p className="onboard-lead mt-2">
          Para finalizar, qual o horário que o seu negócio funciona?
        </p>
      </div>

      <WeekHoursSimple
        deferred
        initialRules={rules}
        onChange={onChange}
      />
    </div>
  );
}
