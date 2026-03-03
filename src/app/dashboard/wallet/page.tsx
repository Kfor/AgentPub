"use client";

import { useState, useEffect } from "react";

interface WalletData {
  address: string | null;
  balance: number;
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchWallet();
  }, []);

  async function fetchWallet() {
    try {
      const res = await fetch("/api/wallet");
      if (res.ok) {
        const data = await res.json();
        if (data.hasWallet && data.wallet) {
          setWallet({
            address: data.wallet.address,
            balance: parseFloat(data.wallet.balance) || 0,
          });
        } else {
          setWallet({ address: null, balance: 0 });
        }
      } else {
        // No wallet yet
        setWallet({ address: null, balance: 0 });
      }
    } catch {
      setWallet({ address: null, balance: 0 });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateWallet() {
    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create wallet");
      }

      const data = await res.json();
      setWallet({
        address: data.wallet?.address || null,
        balance: 0,
      });
      setSuccess("Wallet created successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    setTransferring(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/wallet/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toAddress: recipient,
          amount: parseFloat(amount),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Transfer failed");
      }

      setSuccess(`Successfully transferred ${amount} USDC`);
      setRecipient("");
      setAmount("");
      fetchWallet();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setTransferring(false);
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Wallet</h1>
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Wallet</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
          <button
            onClick={() => setSuccess(null)}
            className="ml-2 font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {!wallet?.address ? (
        /* No wallet yet */
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white py-16 text-center">
          <svg
            className="mx-auto mb-4 h-12 w-12 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
            />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">
            No Wallet Found
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
            Create a USDC wallet to start transacting on the AgentPub
            marketplace.
          </p>
          <button
            onClick={handleCreateWallet}
            disabled={creating}
            className="mt-6 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Wallet"}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Wallet info */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Wallet Address
                </h3>
                <p className="mt-1 break-all font-mono text-sm text-gray-900">
                  {wallet.address}
                </p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Balance
                </h3>
                <p className="mt-1 text-2xl font-bold text-indigo-600">
                  {wallet.balance.toFixed(2)} USDC
                </p>
              </div>
            </div>
          </div>

          {/* Transfer form */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Transfer USDC
            </h2>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label
                  htmlFor="recipient"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Recipient Address
                </label>
                <input
                  id="recipient"
                  type="text"
                  required
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="0x..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label
                  htmlFor="transfer-amount"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Amount (USDC)
                </label>
                <input
                  id="transfer-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="10.00"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={transferring}
                className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {transferring ? "Transferring..." : "Send USDC"}
              </button>
            </form>
          </div>

          {/* Transaction history placeholder */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Transaction History
            </h2>
            <div className="rounded-lg border-2 border-dashed border-gray-200 py-8 text-center">
              <p className="text-sm text-gray-500">
                Transaction history coming soon.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
