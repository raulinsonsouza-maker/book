"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type DeletePageButtonProps = {
  pageId: string;
  pageTitle: string;
  bookingsCount?: number;
  isActive?: boolean;
  redirectTo?: string;
  onDeleted?: () => void;
  onChanged?: () => void;
  compact?: boolean;
};

export function DeletePageButton({
  pageId,
  pageTitle,
  bookingsCount = 0,
  isActive = true,
  redirectTo,
  onDeleted,
  onChanged,
  compact = false,
}: DeletePageButtonProps) {
  const router = useRouter();
  const { confirm, alert } = useConfirm();
  const [loading, setLoading] = useState(false);

  const hasHistory = bookingsCount > 0;
  const btnClass = compact
    ? "btn-secondary !py-1.5 !text-xs text-danger"
    : "btn-secondary text-danger";

  function afterChange() {
    onChanged?.();
    onDeleted?.();
    if (redirectTo) router.push(redirectTo);
    else if (!onChanged && !onDeleted) router.refresh();
  }

  async function patchActive(next: boolean) {
    setLoading(true);
    const res = await fetch(`/api/pages/${pageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    setLoading(false);
    if (!res.ok) {
      await alert({
        title: next ? "Não foi possível reativar" : "Não foi possível desativar",
        description: "Tente novamente em instantes.",
      });
      return false;
    }
    afterChange();
    return true;
  }

  async function askDeactivate() {
    const ok = await confirm({
      title: `Desativar “${pageTitle}”?`,
      description:
        "O link público para de aceitar novos agendamentos. Histórico, pagamentos e clientes continuam salvos no sistema.",
      confirmLabel: "Desativar link",
      cancelLabel: "Manter ativa",
      tone: "danger",
    });
    if (!ok) return;
    await patchActive(false);
  }

  async function askReactivate() {
    const ok = await confirm({
      title: `Reativar “${pageTitle}”?`,
      description: "O link público volta a aceitar novos agendamentos.",
      confirmLabel: "Reativar",
      cancelLabel: "Cancelar",
    });
    if (!ok) return;
    await patchActive(true);
  }

  async function askHardDelete() {
    const ok = await confirm({
      title: `Excluir “${pageTitle}”?`,
      description:
        "Só agendas sem nenhum agendamento podem ser excluídas. Serviços e horários serão removidos. Não dá para desfazer.",
      confirmLabel: "Excluir de vez",
      cancelLabel: "Cancelar",
      tone: "danger",
    });
    if (!ok) return;

    setLoading(true);
    const res = await fetch(`/api/pages/${pageId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (res.status === 409) {
      const deactivateOk = await confirm({
        title: "Não dá para excluir",
        description:
          data.error ||
          "Esta agenda tem histórico. Desative o link público para proteger os agendamentos.",
        confirmLabel: "Desativar link",
        cancelLabel: "Voltar",
        tone: "danger",
      });
      if (deactivateOk) await patchActive(false);
      return;
    }

    if (!res.ok) {
      await alert({
        title: "Não foi possível excluir",
        description: data.error || "Tente novamente em instantes.",
      });
      return;
    }

    onDeleted?.();
    if (redirectTo) router.push(redirectTo);
    else if (!onDeleted) router.refresh();
  }

  if (!isActive) {
    return (
      <button
        type="button"
        disabled={loading}
        onClick={askReactivate}
        className={compact ? "btn-secondary !py-1.5 !text-xs" : "btn-secondary"}
      >
        {loading ? "Reativando…" : "Reativar"}
      </button>
    );
  }

  if (hasHistory) {
    return (
      <button
        type="button"
        disabled={loading}
        onClick={askDeactivate}
        className={btnClass}
        title="Agendas com histórico só podem ser desativadas"
      >
        {loading ? "Desativando…" : "Desativar"}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={askHardDelete}
      className={btnClass}
    >
      {loading ? "Excluindo…" : "Excluir"}
    </button>
  );
}
