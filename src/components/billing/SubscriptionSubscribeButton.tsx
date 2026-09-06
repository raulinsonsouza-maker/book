"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SubscriptionSubscribeButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={loading}
        onClick={() => {
          setLoading(true);
          router.push("/onboarding/pagamento");
        }}
        className="btn-primary w-full sm:w-auto"
      >
        {loading ? "Abrindo…" : "Pagar com Pix ou cartão"}
      </button>
    </div>
  );
}
