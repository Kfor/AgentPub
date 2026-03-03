"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import StatusBadge from "@/components/StatusBadge";
import Link from "next/link";

type UserProfile = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  userType: string;
  bio: string | null;
  skillTags: string[];
  walletAddress: string | null;
  createdAt: string;
  reputation: {
    level: string;
    averageRating: number;
    completionRate: number;
    totalEarnings: number;
    totalSpent: number;
    disputeRate: number;
    tasksCompleted: number;
    tasksCreated: number;
  } | null;
  tasksCreated: Array<{ id: string; title: string; status: string; budgetMax: number }>;
  resourcesCreated: Array<{ id: string; title: string; status: string; price: number; pricingModel: string }>;
  reviewsReceived: Array<{
    id: string;
    rating: number;
    comment: string | null;
    author: { name: string };
  }>;
};

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<Array<{ id: string; name: string; key: string; createdAt: string }>>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");

  useEffect(() => {
    fetch(`/api/users/${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        setProfile(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (session?.user?.id === id) {
      fetch("/api/auth/api-keys")
        .then((r) => r.json())
        .then(setApiKeys)
        .catch(() => {});
    }
  }, [session, id]);

  async function createApiKey() {
    const res = await fetch("/api/auth/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName || "Default" }),
    });
    if (res.ok) {
      const data = await res.json();
      setNewKeyValue(data.key);
      setNewKeyName("");
      // Refresh keys
      fetch("/api/auth/api-keys")
        .then((r) => r.json())
        .then(setApiKeys);
    }
  }

  async function deleteApiKey(keyId: string) {
    await fetch(`/api/auth/api-keys?id=${keyId}`, { method: "DELETE" });
    setApiKeys(apiKeys.filter((k) => k.id !== keyId));
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!profile) return <div className="p-8 text-center text-gray-500">User not found</div>;

  const isOwner = session?.user?.id === id;
  const rep = profile.reputation;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Profile Header */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600">
            {profile.name?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
              <StatusBadge status={profile.userType} />
              {rep && <StatusBadge status={rep.level} />}
            </div>
            {profile.bio && <p className="mt-1 text-sm text-gray-600">{profile.bio}</p>}
            <p className="text-xs text-gray-400">
              Member since {new Date(profile.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {profile.skillTags.length > 0 && (
          <div className="mt-4 flex gap-1 flex-wrap">
            {profile.skillTags.map((tag) => (
              <span key={tag} className="inline-flex rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Reputation Stats */}
      {rep && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Rating", value: `${rep.averageRating.toFixed(1)}/5` },
            { label: "Completion", value: `${rep.completionRate.toFixed(0)}%` },
            { label: "Tasks Done", value: rep.tasksCompleted.toString() },
            { label: "Dispute Rate", value: `${rep.disputeRate.toFixed(1)}%` },
            { label: "Total Earned", value: `${rep.totalEarnings.toFixed(2)} USDC` },
            { label: "Total Spent", value: `${rep.totalSpent.toFixed(2)} USDC` },
            { label: "Tasks Created", value: rep.tasksCreated.toString() },
            { label: "Level", value: rep.level },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="text-xs text-gray-500">{stat.label}</div>
              <div className="text-lg font-semibold text-gray-900">{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* API Keys (owner only) */}
      {isOwner && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">API Keys</h2>
          <p className="text-sm text-gray-500 mb-4">
            Use API keys for agent authentication. Pass as Bearer token in the Authorization header.
          </p>

          {newKeyValue && (
            <div className="mb-4 rounded-md bg-green-50 p-3 text-sm">
              <p className="font-medium text-green-800">New key created! Copy it now — it won&apos;t be shown again:</p>
              <code className="block mt-1 bg-white p-2 rounded text-xs break-all">{newKeyValue}</code>
            </div>
          )}

          <div className="space-y-2 mb-4">
            {apiKeys.map((k) => (
              <div key={k.id} className="flex items-center justify-between rounded border border-gray-200 p-3">
                <div>
                  <span className="font-medium text-sm">{k.name}</span>
                  <span className="ml-2 text-xs text-gray-400 font-mono">{k.key}</span>
                </div>
                <button
                  onClick={() => deleteApiKey(k.id)}
                  className="text-xs text-red-600 hover:text-red-500"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Key name"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              onClick={createApiKey}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500"
            >
              Create Key
            </button>
          </div>
        </div>
      )}

      {/* Reviews */}
      {profile.reviewsReceived.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Reviews</h2>
          <div className="space-y-3">
            {profile.reviewsReceived.map((r) => (
              <div key={r.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{r.author.name}</span>
                  <span className="text-amber-500">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                </div>
                {r.comment && <p className="mt-1 text-sm text-gray-600">{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="mt-6 flex gap-4">
        <Link href="/tasks" className="text-sm text-indigo-600 hover:underline">
          Browse Tasks →
        </Link>
        <Link href="/resources" className="text-sm text-indigo-600 hover:underline">
          Browse Resources →
        </Link>
        {isOwner && (
          <Link href="/wallet" className="text-sm text-indigo-600 hover:underline">
            Wallet →
          </Link>
        )}
      </div>
    </div>
  );
}
