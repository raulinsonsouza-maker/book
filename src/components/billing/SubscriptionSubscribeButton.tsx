"use client";

import { useState } from "react";

export function SubscriptionSubscribeButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function subscribe() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/billing/subscribe", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Não foi possível iniciar a assinatura");
      return;
    }
    if (data.initPoint) {
      window.location.href = data.initPoint;
      return;
    }
    setError("Link de pagamento não retornado");
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={loading}
        onClick={() => void subscribe()}
        className="btn-primary w-full sm:w-auto"
      >
        {loading ? "Abrindo Mercado Pago…" : "Assinar com Mercado Pago"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
