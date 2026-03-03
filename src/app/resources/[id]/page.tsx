"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import StatusBadge from "@/components/StatusBadge";
import Link from "next/link";

type Resource = {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  pricingModel: string;
  price: number;
  status: string;
  totalUnits: number | null;
  usedUnits: number;
  createdAt: string;
  creator: {
    id: string;
    name: string;
    image: string | null;
    userType: string;
    reputation: { level: string; averageRating: number } | null;
  };
  rentals: Array<{
    id: string;
    unitsUsed: number;
    totalCost: number;
    status: string;
    createdAt: string;
    renter: { id: string; name: string };
  }>;
};

export default function ResourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [rentUnits, setRentUnits] = useState("1");
  const [rentDays, setRentDays] = useState("30");
  const [actionMsg, setActionMsg] = useState("");
  const [renting, setRenting] = useState(false);

  function fetchResource() {
    fetch(`/api/resources/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setResource(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchResource();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!resource) return <div className="p-8 text-center text-gray-500">Resource not found</div>;

  const isCreator = session?.user?.id === resource.creator.id;

  async function handleRent() {
    setRenting(true);
    setActionMsg("");
    const res = await fetch(`/api/resources/${id}/rent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ units: rentUnits, durationDays: rentDays }),
    });
    setRenting(false);
    if (res.ok) {
      const data = await res.json();
      setActionMsg(`Rented! Total: ${data.totalCost} USDC (fee: ${data.platformFee.toFixed(2)} USDC)`);
      fetchResource();
    } else {
      const data = await res.json();
      setActionMsg(data.error || "Failed to rent");
    }
  }

  const pricingLabel = {
    PER_CALL: "per call",
    PER_UNIT: "per unit",
    PER_TIME: "per day",
    BUYOUT: "buyout",
  }[resource.pricingModel] || resource.pricingModel;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {actionMsg && (
        <div className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-700">{actionMsg}</div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{resource.title}</h1>
              <StatusBadge status={resource.status} />
            </div>
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
              <span>
                Listed by{" "}
                <Link href={`/profile/${resource.creator.id}`} className="text-indigo-600 hover:underline">
                  {resource.creator.name}
                </Link>
              </span>
              <span>{resource.category}</span>
              <StatusBadge status={resource.pricingModel} />
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{resource.price}</div>
            <div className="text-sm text-gray-500">USDC {pricingLabel}</div>
          </div>
        </div>

        <p className="mt-4 text-gray-700 whitespace-pre-wrap">{resource.description}</p>

        {resource.tags.length > 0 && (
          <div className="mt-4 flex gap-1 flex-wrap">
            {resource.tags.map((tag) => (
              <span key={tag} className="inline-flex rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {tag}
              </span>
            ))}
          </div>
        )}

        {resource.totalUnits && (
          <div className="mt-3 text-sm text-gray-500">
            Availability: {resource.totalUnits - resource.usedUnits} / {resource.totalUnits} units remaining
          </div>
        )}

        {resource.creator.reputation && (
          <div className="mt-3 text-sm text-gray-500">
            Provider reputation: <StatusBadge status={resource.creator.reputation.level} />{" "}
            ({resource.creator.reputation.averageRating.toFixed(1)}/5)
          </div>
        )}
      </div>

      {/* Rent/Buy */}
      {session?.user && !isCreator && resource.status === "AVAILABLE" && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {resource.pricingModel === "BUYOUT" ? "Buy This Resource" : "Rent This Resource"}
          </h2>
          <div className="flex gap-4 items-end">
            {resource.pricingModel === "PER_UNIT" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Units</label>
                <input
                  type="number"
                  min="1"
                  value={rentUnits}
                  onChange={(e) => setRentUnits(e.target.value)}
                  className="mt-1 w-32 rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            )}
            {resource.pricingModel === "PER_TIME" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Days</label>
                <input
                  type="number"
                  min="1"
                  value={rentDays}
                  onChange={(e) => setRentDays(e.target.value)}
                  className="mt-1 w-32 rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            )}
            <button
              onClick={handleRent}
              disabled={renting}
              className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {renting
                ? "Processing..."
                : resource.pricingModel === "BUYOUT"
                  ? `Buy for ${resource.price} USDC`
                  : "Rent Now"}
            </button>
          </div>
        </div>
      )}

      {/* Recent Rentals */}
      {resource.rentals.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-2">
            {resource.rentals.map((r) => (
              <div key={r.id} className="rounded-lg border border-gray-200 bg-white p-3 flex justify-between text-sm">
                <span>
                  <Link href={`/profile/${r.renter.id}`} className="text-indigo-600 hover:underline">
                    {r.renter.name}
                  </Link>{" "}
                  rented {r.unitsUsed > 0 ? `${r.unitsUsed} units` : ""}
                </span>
                <span className="text-gray-500">{r.totalCost} USDC</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
