"use client";

import { useState } from "react";

interface RentBuyButtonProps {
  resourceId: string;
  pricingModel: string;
}

export default function RentBuyButton({
  resourceId,
  pricingModel,
}: RentBuyButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isBuyout = pricingModel === "BUYOUT";
  const label = isBuyout ? "Buy Now" : "Rent Resource";

  async function handleAction() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/resources/${resourceId}/rent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to complete transaction");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center text-sm text-green-700">
        Transaction successful!
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      <button
        onClick={handleAction}
        disabled={loading}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Processing..." : label}
      </button>
    </div>
  );
}
