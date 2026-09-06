"use client";

import type { OnboardingStepId, OnboardingStepMeta } from "./types";

type Props = {
  steps: OnboardingStepMeta[];
  current: OnboardingStepId;
  /** When true, all prior steps show as complete (success screen). */
  allComplete?: boolean;
};

export function OnboardingStepper({ steps, current, allComplete }: Props) {
  const currentIdx = steps.findIndex((s) => s.id === current);

  return (
    <ol className="onboard-stepper" aria-label="Progresso do cadastro">
      {steps.map((step, i) => {
        const done = allComplete || i < currentIdx;
        const active = !allComplete && i === currentIdx;
        const upcoming = !allComplete && i > currentIdx;

        return (
          <li
            key={step.id}
            className={[
              "onboard-stepper-item",
              done ? "is-done" : "",
              active ? "is-active" : "",
              upcoming ? "is-upcoming" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="onboard-stepper-marker" aria-hidden>
              {done ? (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3.5 8.2l2.8 2.8L12.5 5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <span>{i + 1}</span>
              )}
            </span>
            <div className="onboard-stepper-copy">
              <p className="onboard-stepper-label">{step.label}</p>
              <p className="onboard-stepper-desc">{step.description}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
