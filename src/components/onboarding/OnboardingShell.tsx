"use client";

import type { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { OnboardingStepper } from "./OnboardingStepper";
import {
  ONBOARDING_STEPS,
  type OnboardingStepId,
  type OnboardingStepMeta,
} from "./types";

type Props = {
  step: OnboardingStepId;
  steps?: OnboardingStepMeta[];
  sidebarTitle?: string;
  helpHref?: string;
  onBack?: () => void;
  showBack?: boolean;
  skipLabel?: string;
  onSkip?: () => void;
  skipDisabled?: boolean;
  children: ReactNode;
};

export function OnboardingShell({
  step,
  steps = ONBOARDING_STEPS,
  sidebarTitle = "Poucos passos para transformar seu negócio",
  helpHref = "#",
  onBack,
  showBack = false,
  skipLabel,
  onSkip,
  skipDisabled,
  children,
}: Props) {
  const allComplete = step === "pronto";

  return (
    <div className="onboard-split">
      <aside className="onboard-sidebar" aria-label="Progresso">
        <div className="onboard-sidebar-inner">
          <BrandLogo href="/" size="md" showText light />
          <h2 className="onboard-sidebar-title">{sidebarTitle}</h2>
          <OnboardingStepper
            steps={steps}
            current={step}
            allComplete={allComplete}
          />
        </div>
        <div className="onboard-sidebar-deco" aria-hidden />
      </aside>

      <div className="onboard-workspace">
        <div className="onboard-workspace-top">
          {showBack && onBack ? (
            <button type="button" className="onboard-back" onClick={onBack}>
              <span aria-hidden>‹</span> Voltar
            </button>
          ) : (
            <span />
          )}
          <a
            href={helpHref}
            className="onboard-help"
            onClick={(e) => {
              if (helpHref === "#") e.preventDefault();
            }}
          >
            Precisa de ajuda?
          </a>
        </div>

        <div className="onboard-workspace-body">{children}</div>

        {skipLabel && onSkip && step !== "pronto" && step !== "conta" && (
          <div className="onboard-workspace-skip">
            <button
              type="button"
              disabled={skipDisabled}
              onClick={onSkip}
              className="onboard-skip-link"
            >
              {skipLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
