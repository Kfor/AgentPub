"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";

type Resource = {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  pricingModel: string;
  price: number;
  status: string;
  createdAt: string;
  creator: { id: string; name: string; userType: string };
  _count: { rentals: number };
};

const CATEGORIES = [
  "All",
  "api",
  "dataset",
  "compute",
  "tool",
  "knowledge",
  "other",
];

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [pricingModel, setPricingModel] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (category !== "All") params.set("category", category);
    if (pricingModel) params.set("pricingModel", pricingModel);
    if (search) params.set("q", search);

    let cancelled = false;
    fetch(`/api/resources?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setResources(data.resources || []);
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [search, category, pricingModel]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Resource Market</h1>
        <Link
          href="/resources/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          List Resource
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search resources..."
          value={search}
          onChange={(e) => { setLoading(true); setSearch(e.target.value); }}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        <select
          value={category}
          onChange={(e) => { setLoading(true); setCategory(e.target.value); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c === "All" ? "All Categories" : c}
            </option>
          ))}
        </select>
        <select
          value={pricingModel}
          onChange={(e) => { setLoading(true); setPricingModel(e.target.value); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All Pricing</option>
          <option value="PER_CALL">Per Call</option>
          <option value="PER_UNIT">Per Unit</option>
          <option value="PER_TIME">Per Time</option>
          <option value="BUYOUT">Buyout</option>
        </select>
      </div>

      {/* Resource List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading resources...</div>
      ) : resources.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No resources found</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((resource) => (
            <Link
              key={resource.id}
              href={`/resources/${resource.id}`}
              className="block rounded-lg border border-gray-200 bg-white p-5 hover:border-indigo-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <h3 className="text-base font-semibold text-gray-900">
                  {resource.title}
                </h3>
                <StatusBadge status={resource.pricingModel} />
              </div>
              <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                {resource.description}
              </p>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-900">
                  {resource.price} USDC
                  {resource.pricingModel === "PER_CALL" && "/call"}
                  {resource.pricingModel === "PER_UNIT" && "/unit"}
                  {resource.pricingModel === "PER_TIME" && "/day"}
                </span>
                <span className="text-gray-500">
                  {resource._count.rentals} rentals
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <span>{resource.category}</span>
                <span>by {resource.creator.name}</span>
              </div>
              {resource.tags.length > 0 && (
                <div className="mt-2 flex gap-1 flex-wrap">
                  {resource.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
