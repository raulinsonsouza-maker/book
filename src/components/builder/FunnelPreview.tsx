"use client";

import type { FunnelConfig } from "@/types/funnel-config";
import { FunnelLandingBlocks } from "@/components/booking/FunnelLandingBlocks";
import { enabledFormFields } from "@/lib/funnel-config";

type Props = {
  slug: string;
  config: FunnelConfig;
};

export function FunnelPreview({ config }: Props) {
  const accent = config.theme.accentColor || "#0a0a0a";
  const fields = enabledFormFields(config);

  return (
    <div className="mx-auto max-w-lg">
      <div className="surface overflow-hidden shadow-md">
        <div className="grid md:grid-cols-[200px_1fr]">
          <aside className="border-b border-border bg-muted-bg/40 p-4 md:border-b-0 md:border-r">
            {config.theme.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={config.theme.logoUrl}
                alt=""
                className="mb-3 h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <div
                className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg text-[10px] font-bold text-white"
                style={{ background: accent }}
              >
                {(config.theme.heroTitle || "BS").slice(0, 2).toUpperCase()}
              </div>
            )}
            <h2 className="text-sm font-bold leading-snug">
              {config.theme.heroTitle || "Sua página"}
            </h2>
            {config.theme.heroSubtitle && (
              <p className="mt-1 text-[11px] text-muted line-clamp-3">
                {config.theme.heroSubtitle}
              </p>
            )}
            <div className="mt-3">
              <FunnelLandingBlocks blocks={config.blocks} />
            </div>
          </aside>
          <div className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Preview — etapa Dados
            </p>
            <div className="mt-3 space-y-2">
              {fields.map((f) => (
                <div key={f.id} className="rounded-lg border border-border bg-white px-3 py-2">
                  <p className="text-[10px] text-muted">{f.label}</p>
                  <div className="mt-1 h-8 rounded border border-dashed border-border bg-muted-bg/30" />
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn-primary mt-4 w-full !py-2 text-xs"
              style={{ background: accent }}
            >
              Ir para pagamento
            </button>
          </div>
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] text-muted">
        Preview simplificado — serviço, horário e pagamento seguem o funil padrão
      </p>
    </div>
  );
}
