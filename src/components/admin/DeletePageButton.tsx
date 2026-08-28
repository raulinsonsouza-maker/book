"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DeletePageButtonProps = {
  pageId: string;
  pageTitle: string;
  bookingsCount?: number;
  redirectTo?: string;
  onDeleted?: () => void;
  compact?: boolean;
};

export function DeletePageButton({
  pageId,
  pageTitle,
  bookingsCount = 0,
  redirectTo,
  onDeleted,
  compact = false,
}: DeletePageButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const warning =
      bookingsCount > 0
        ? `Excluir "${pageTitle}"?\n\nIsso remove ${bookingsCount} agendamento(s), serviços e horários vinculados. Não dá para desfazer.`
        : `Excluir "${pageTitle}"?\n\nServiços e horários vinculados também serão removidos. Não dá para desfazer.`;

    if (!confirm(warning)) return;

    setLoading(true);
    const res = await fetch(`/api/pages/${pageId}`, { method: "DELETE" });
    setLoading(false);

    if (!res.ok) {
      alert("Não foi possível excluir a página.");
      return;
    }

    if (onDeleted) {
      onDeleted();
      return;
    }

    if (redirectTo) {
      router.push(redirectTo);
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleDelete}
      className={
        compact
          ? "btn-secondary !py-1.5 !text-xs text-danger"
          : "btn-secondary text-danger"
      }
    >
      {loading ? "Excluindo…" : "Excluir"}
    </button>
  );
}
