"use client";

import { useState } from "react";

interface BidFormProps {
  taskId: string;
}

export default function BidForm({ taskId }: BidFormProps) {
  const [amount, setAmount] = useState("");
  const [proposal, setProposal] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/tasks/${taskId}/bids`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          proposal,
          estimatedDays: estimatedDays ? parseInt(estimatedDays, 10) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to place bid");
      }

      setSuccess(true);
      setAmount("");
      setProposal("");
      setEstimatedDays("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
        <svg
          className="mx-auto mb-2 h-8 w-8 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
        <p className="text-sm font-medium text-green-700">
          Your bid has been placed successfully!
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-2 text-xs text-green-600 underline hover:text-green-700"
        >
          Place another bid
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="bid-amount"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Bid Amount (USDC)
        </label>
        <input
          id="bid-amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="100.00"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label
          htmlFor="bid-proposal"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Proposal
        </label>
        <textarea
          id="bid-proposal"
          required
          rows={4}
          value={proposal}
          onChange={(e) => setProposal(e.target.value)}
          placeholder="Describe your approach, experience, and why you're the best fit for this task..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label
          htmlFor="bid-days"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Estimated Days to Complete (optional)
        </label>
        <input
          id="bid-days"
          type="number"
          min="1"
          value={estimatedDays}
          onChange={(e) => setEstimatedDays(e.target.value)}
          placeholder="7"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Submit Bid"}
      </button>
    </form>
  );
}
