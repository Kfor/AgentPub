"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  "code",
  "text",
  "data",
  "translation",
  "design",
  "proxy",
  "other",
];

export default function NewTaskPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const body = {
      title: formData.get("title"),
      description: formData.get("description"),
      category: formData.get("category"),
      skillTags: (formData.get("skillTags") as string)
        ?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) || [],
      budgetMin: formData.get("budgetMin"),
      budgetMax: formData.get("budgetMax"),
      deadline: formData.get("deadline") || null,
      verificationLevel: parseInt(formData.get("verificationLevel") as string) || 2,
    };

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create task");
      setLoading(false);
      return;
    }

    const task = await res.json();
    router.push(`/tasks/${task.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Post a Task</h1>
      <p className="mt-1 text-sm text-gray-500">
        Describe what you need done and set a budget in USDC.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input
            name="title"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="e.g. Clean and transform CSV to JSON"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            name="description"
            required
            rows={5}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Describe the task in detail: what needs to be done, expected output format, any constraints..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select
              name="category"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Verification Level
            </label>
            <select
              name="verificationLevel"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="1">L1 - Automatic</option>
              <option value="2" selected>L2 - Manual Review</option>
              <option value="3">L3 - AI Arbitration</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Skill Tags (comma-separated)
          </label>
          <input
            name="skillTags"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="python, data-cleaning, json"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Min Budget (USDC)
            </label>
            <input
              name="budgetMin"
              type="number"
              step="0.01"
              min="0"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Max Budget (USDC)
            </label>
            <input
              name="budgetMax"
              type="number"
              step="0.01"
              min="0"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Deadline (optional)
          </label>
          <input
            name="deadline"
            type="date"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Post Task"}
        </button>
      </form>
    </div>
  );
}
