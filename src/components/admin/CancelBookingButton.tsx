"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useConfirm } from "@/components/ui/ConfirmDialog";

export function CancelBookingButton({
  id,
  onDone,
}: {
  id: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const { confirm } = useConfirm();
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        const ok = await confirm({
          title: "Cancelar agendamento?",
          description:
            "O horário será liberado e o cliente poderá ser notificado, conforme suas configurações.",
          confirmLabel: "Cancelar agendamento",
          cancelLabel: "Voltar",
          tone: "danger",
        });
        if (!ok) return;
        setLoading(true);
        await fetch("/api/bookings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        setLoading(false);
        if (onDone) onDone();
        else router.refresh();
      }}
      className="text-xs text-danger hover:underline"
    >
      Cancelar
    </button>
  );
}
