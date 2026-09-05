"use client";

import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  pageId: string;
  pageTitle: string;
  redirectTo?: string;
  onDeactivated?: () => void;
  compact?: boolean;
};

/** Desativa o link público — não apaga serviços, profissionais nem faturamento. */
export function DeletePageButton({
  pageId,
  pageTitle,
  redirectTo = "/app/agendador",
  onDeactivated,
  compact = false,
}: Props) {
  const router = useRouter();
  const { confirm, alert } = useConfirm();
  const [loading, setLoading] = useState(false);

  async function deactivate() {
    const ok = await confirm({
      title: `Excluir “${pageTitle}”?`,
      description:
        "O link público deixa de funcionar. Serviços, horários, profissionais e o faturamento continuam salvos na sua conta.",
      confirmLabel: "Excluir página",
      cancelLabel: "Manter",
      tone: "danger",
    });
    if (!ok) return;

    setLoading(true);
    const res = await fetch(`/api/pages/${pageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    setLoading(false);
    if (!res.ok) {
      await alert({
        title: "Não foi possível excluir",
        description: "Tente novamente em instantes.",
      });
      return;
    }
    onDeactivated?.();
    router.push(redirectTo);
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => void deactivate()}
      className={
        compact
          ? "btn-secondary !py-1.5 !text-xs text-danger"
          : "btn-secondary text-danger"
      }
    >
      {loading ? "Excluindo…" : "Excluir página"}
    </button>
  );
}
