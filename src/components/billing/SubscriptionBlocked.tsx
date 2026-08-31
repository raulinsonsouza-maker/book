"use client";

import { SubscriptionSubscribeButton } from "@/components/billing/SubscriptionSubscribeButton";

export function SubscriptionBlocked({
  reason,
  supportEmail,
}: {
  reason: string;
  supportEmail?: string | null;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center space-y-4 text-center">
      <div className="surface w-full space-y-4 p-8">
        <h1 className="text-xl font-semibold tracking-tight">
          Assinatura necessária
        </h1>
        <p className="text-sm leading-relaxed text-muted">{reason}</p>
        <SubscriptionSubscribeButton />
        {supportEmail && (
          <a href={`mailto:${supportEmail}`} className="btn-secondary inline-block">
            Falar com suporte
          </a>
        )}
      </div>
    </div>
  );
}
