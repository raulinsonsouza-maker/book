"use client";

import { formatBRL } from "@/lib/utils";

type SuccessStepProps = {
  customerName: string;
  customerEmail: string;
  productTitle: string;
  priceCents: number;
};

export function SuccessStep({
  customerName,
  customerEmail,
  productTitle,
  priceCents,
}: SuccessStepProps) {
  const hasEmail = customerEmail?.includes("@");
  return (
    <div className="space-y-4 text-center animate-in">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-2xl">
        ✓
      </div>
      <h2 className="text-2xl font-bold tracking-tight">Tudo certo!</h2>
      <p className="text-sm text-muted">
        {hasEmail ? (
          <>
            Enviamos a confirmação para <strong>{customerEmail}</strong>.
          </>
        ) : (
          "Pagamento confirmado. Guarde os detalhes abaixo."
        )}
      </p>
      <div className="rounded-lg border border-border bg-muted-bg/50 p-4 text-left text-sm">
        <p className="font-medium">{customerName}</p>
        <p className="mt-1 text-muted">{productTitle}</p>
        <p className="mt-2 text-lg font-bold">{formatBRL(priceCents)}</p>
      </div>
    </div>
  );
}
