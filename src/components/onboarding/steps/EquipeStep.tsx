"use client";

import type { ProDraft } from "@/components/onboarding/types";
import { formatPhone } from "@/lib/utils";

export type { ProDraft };

type Props = {
  businessMode: "SOLO" | "SALON";
  professionals: ProDraft[];
  onModeChange: (mode: "SOLO" | "SALON") => void;
  onProfessionalsChange: (pros: ProDraft[]) => void;
  onClearError: () => void;
};

function updatePro(
  list: ProDraft[],
  index: number,
  patch: Partial<ProDraft>,
): ProDraft[] {
  const next = [...list];
  next[index] = { ...list[index]!, ...patch };
  return next;
}

export function EquipeStep({
  businessMode,
  professionals,
  onModeChange,
  onProfessionalsChange,
  onClearError,
}: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="onboard-title text-2xl sm:text-[1.85rem]">
          Quem atende na agenda?
        </h1>
        <p className="onboard-lead mt-2">
          Só você, ou uma equipe com login próprio.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            onModeChange("SOLO");
            onClearError();
          }}
          className={`onboard-choice ${
            businessMode === "SOLO" ? "onboard-choice-active" : ""
          }`}
        >
          <p className="font-semibold">Só eu</p>
          <p className="onboard-choice-desc mt-1 text-xs">
            Uma agenda. Você atende tudo.
          </p>
        </button>
        <button
          type="button"
          onClick={() => {
            onModeChange("SALON");
            onClearError();
          }}
          className={`onboard-choice ${
            businessMode === "SALON" ? "onboard-choice-active" : ""
          }`}
        >
          <p className="font-semibold">Tenho equipe</p>
          <p className="onboard-choice-desc mt-1 text-xs">
            Cada um com horário e acesso ao painel.
          </p>
        </button>
      </div>

      {businessMode === "SALON" && (
        <div className="onboard-pro-section">
          <div className="onboard-pro-section-head">
            <p className="text-sm font-semibold text-[var(--lp-ink)]">
              Cadastre a equipe
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--lp-steel)]">
              Nome, e-mail e WhatsApp de cada pessoa. Depois do pagamento,
              enviamos o acesso para criar a senha.
            </p>
          </div>

          <div className="onboard-pro-list">
            {professionals.map((pro, i) => (
              <div key={i} className="onboard-pro-card">
                <div className="onboard-pro-card-head">
                  <span className="onboard-pro-index" aria-hidden>
                    {i + 1}
                  </span>
                  <span className="text-sm font-semibold">
                    Profissional {i + 1}
                  </span>
                  {professionals.length > 1 && (
                    <button
                      type="button"
                      className="onboard-pro-remove"
                      onClick={() => {
                        onProfessionalsChange(
                          professionals.filter((_, j) => j !== i),
                        );
                        onClearError();
                      }}
                    >
                      Remover
                    </button>
                  )}
                </div>

                <label className="onboard-pro-field">
                  <span>Nome</span>
                  <input
                    className="input-field"
                    placeholder="Nome completo"
                    value={pro.displayName}
                    autoComplete="name"
                    onChange={(e) => {
                      onProfessionalsChange(
                        updatePro(professionals, i, {
                          displayName: e.target.value,
                        }),
                      );
                      onClearError();
                    }}
                  />
                </label>

                <div className="onboard-pro-grid">
                  <label className="onboard-pro-field">
                    <span>E-mail</span>
                    <input
                      type="email"
                      className="input-field"
                      placeholder="nome@email.com"
                      value={pro.email}
                      autoComplete="email"
                      onChange={(e) => {
                        onProfessionalsChange(
                          updatePro(professionals, i, {
                            email: e.target.value,
                          }),
                        );
                        onClearError();
                      }}
                    />
                  </label>
                  <label className="onboard-pro-field">
                    <span>WhatsApp</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      className="input-field"
                      placeholder="(11) 99999-9999"
                      value={pro.phone || ""}
                      autoComplete="tel"
                      onChange={(e) => {
                        onProfessionalsChange(
                          updatePro(professionals, i, {
                            phone: formatPhone(e.target.value),
                          }),
                        );
                        onClearError();
                      }}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="onboard-pro-add"
            onClick={() =>
              onProfessionalsChange([
                ...professionals,
                { displayName: "", email: "", phone: "" },
              ])
            }
          >
            <span className="onboard-pro-add-icon" aria-hidden>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 2.5v9M2.5 7h9"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="onboard-pro-add-copy">
              <span className="onboard-pro-add-title">
                Adicionar profissional
              </span>
              <span className="onboard-pro-add-hint">
                Nome, e-mail e WhatsApp
              </span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
