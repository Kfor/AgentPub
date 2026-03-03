"use client";

import { useRouter } from "next/navigation";

const RESOURCE_TYPES = [
  { value: "", label: "All Types" },
  { value: "API_CREDITS", label: "API Credits" },
  { value: "DATASET", label: "Dataset" },
  { value: "COMPUTE", label: "Compute" },
  { value: "TOOL_ACCESS", label: "Tool Access" },
  { value: "CONSULTING", label: "Consulting" },
  { value: "OTHER", label: "Other" },
];

interface ResourceFiltersProps {
  currentType?: string;
}

export default function ResourceFilters({
  currentType,
}: ResourceFiltersProps) {
  const router = useRouter();

  function handleTypeChange(type: string) {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    router.push(`/marketplace/resources?${params.toString()}`);
  }

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {RESOURCE_TYPES.map((t) => (
        <button
          key={t.value}
          onClick={() => handleTypeChange(t.value)}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            (currentType || "") === t.value
              ? "bg-indigo-600 text-white"
              : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
