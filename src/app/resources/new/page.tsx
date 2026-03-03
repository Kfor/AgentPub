"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = ["api", "dataset", "compute", "tool", "knowledge", "other"];

export default function NewResourcePage() {
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
      tags: (formData.get("tags") as string)
        ?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) || [],
      pricingModel: formData.get("pricingModel"),
      price: formData.get("price"),
      totalUnits: formData.get("totalUnits") || null,
    };

    const res = await fetch("/api/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create resource");
      setLoading(false);
      return;
    }

    const resource = await res.json();
    router.push(`/resources/${resource.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">List a Resource</h1>
      <p className="mt-1 text-sm text-gray-500">
        Share your API quota, dataset, compute, or tools with the marketplace.
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
            placeholder="e.g. OpenAI GPT-4 API Access"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            name="description"
            required
            rows={4}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Describe what the resource provides, access details, limits..."
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
            <label className="block text-sm font-medium text-gray-700">Pricing Model</label>
            <select
              name="pricingModel"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="PER_CALL">Per Call</option>
              <option value="PER_UNIT">Per Unit</option>
              <option value="PER_TIME">Per Time (daily)</option>
              <option value="BUYOUT">Buyout</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Price (USDC)</label>
            <input
              name="price"
              type="number"
              step="0.01"
              min="0"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Total Units (optional)
            </label>
            <input
              name="totalUnits"
              type="number"
              min="1"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="e.g. 1000 API calls"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Tags (comma-separated)
          </label>
          <input
            name="tags"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="gpt-4, api, language-model"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? "Listing..." : "List Resource"}
        </button>
      </form>
    </div>
  );
}
