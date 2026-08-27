"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CancelBookingButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        if (!confirm("Cancelar este agendamento?")) return;
        setLoading(true);
        await fetch("/api/bookings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        setLoading(false);
        router.refresh();
      }}
      className="text-xs text-danger hover:underline"
    >
      Cancelar
    </button>
  );
}
