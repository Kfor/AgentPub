"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type WalletData = {
  walletAddress: string | null;
  balance: number;
  escrowedAmount: number;
  pendingEarnings: number;
  recentTransactions: Array<{
    id: string;
    amount: number;
    type: string;
    txHash: string | null;
    createdAt: string;
  }>;
};

export default function WalletPage() {
  const { data: session } = useSession();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newAddress, setNewAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/wallet")
      .then((r) => r.json())
      .then((data) => {
        setWallet(data);
        setLoading(false);
      });
  }, [session]);

  async function updateWalletAddress() {
    setSaving(true);
    const res = await fetch("/api/wallet", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: newAddress }),
    });
    setSaving(false);
    if (res.ok) {
      setMsg("Wallet address updated!");
      setWallet((w) => w ? { ...w, walletAddress: newAddress } : w);
      setNewAddress("");
    }
  }

  if (!session?.user) {
    return (
      <div className="p-8 text-center text-gray-500">
        Please sign in to view your wallet.
      </div>
    );
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading wallet...</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Wallet</h1>

      {msg && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">{msg}</div>
      )}

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="text-sm text-gray-500">Available Balance</div>
          <div className="text-3xl font-bold text-gray-900">
            {(wallet?.balance || 0).toFixed(2)}
          </div>
          <div className="text-sm text-gray-400">USDC</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="text-sm text-gray-500">In Escrow</div>
          <div className="text-3xl font-bold text-amber-600">
            {(wallet?.escrowedAmount || 0).toFixed(2)}
          </div>
          <div className="text-sm text-gray-400">USDC</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="text-sm text-gray-500">Pending Earnings</div>
          <div className="text-3xl font-bold text-green-600">
            {(wallet?.pendingEarnings || 0).toFixed(2)}
          </div>
          <div className="text-sm text-gray-400">USDC</div>
        </div>
      </div>

      {/* Wallet Address */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Wallet Address</h2>
        <p className="text-sm text-gray-500 mb-4">
          Connect your Base chain wallet for USDC payments. Uses Coinbase CDP Server Wallets for gasless transactions.
        </p>
        {wallet?.walletAddress ? (
          <div className="rounded bg-gray-50 p-3 font-mono text-sm break-all">
            {wallet.walletAddress}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No wallet connected</p>
        )}
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            placeholder="0x... (Base chain address)"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
          />
          <button
            onClick={updateWalletAddress}
            disabled={saving || !newAddress}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Update"}
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Transactions
        </h2>
        {!wallet?.recentTransactions?.length ? (
          <p className="text-sm text-gray-400">No transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {wallet.recentTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-100">
                    <td className="py-2 text-gray-700">{tx.type.replace(/_/g, " ")}</td>
                    <td
                      className={`py-2 font-medium ${
                        tx.amount >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {tx.amount >= 0 ? "+" : ""}
                      {tx.amount.toFixed(2)} USDC
                    </td>
                    <td className="py-2 text-gray-500">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 text-gray-400 font-mono text-xs">
                      {tx.txHash ? tx.txHash.slice(0, 10) + "..." : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
