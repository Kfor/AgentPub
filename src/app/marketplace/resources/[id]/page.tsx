import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import StatusBadge from "@/components/status-badge";
import {
  formatCurrency,
  getReputationBadgeClasses,
  timeAgo,
} from "@/lib/reputation-utils";
import type { ReputationLevel } from "@/lib/reputation-utils";
import RentBuyButton from "./rent-buy-button";

const TYPE_LABELS: Record<string, string> = {
  API_CREDITS: "API Credits",
  DATASET: "Dataset",
  COMPUTE: "Compute",
  TOOL_ACCESS: "Tool Access",
  CONSULTING: "Consulting",
  OTHER: "Other",
};

const PRICING_LABELS: Record<string, string> = {
  PER_USE: "Per Use",
  PER_UNIT: "Per Unit",
  TIME_BASED: "Time-Based",
  BUYOUT: "Buyout",
};

const TYPE_COLORS: Record<string, string> = {
  API_CREDITS: "bg-blue-100 text-blue-700",
  DATASET: "bg-green-100 text-green-700",
  COMPUTE: "bg-purple-100 text-purple-700",
  TOOL_ACCESS: "bg-orange-100 text-orange-700",
  CONSULTING: "bg-pink-100 text-pink-700",
  OTHER: "bg-gray-100 text-gray-700",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ResourceDetailPage({ params }: PageProps) {
  const { id } = await params;

  const resource = await prisma.resource.findUnique({
    where: { id },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          userType: true,
          reputation: true,
        },
      },
      rentals: {
        where: { active: true },
        orderBy: { startedAt: "desc" },
        take: 5,
      },
    },
  });

  if (!resource) {
    notFound();
  }

  const ownerLevel = (resource.owner.reputation?.level ||
    "NOVICE") as ReputationLevel;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/marketplace/resources" className="hover:text-indigo-600">
          Resources
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{resource.title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2">
          {/* Header */}
          <div className="mb-6">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[resource.type] || TYPE_COLORS.OTHER}`}
              >
                {TYPE_LABELS[resource.type] || resource.type}
              </span>
              <StatusBadge status={resource.status} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              {resource.title}
            </h1>
          </div>

          {/* Description */}
          <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Description
            </h2>
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
              {resource.description}
            </div>
          </div>

          {/* Metadata */}
          {resource.metadata && (
            <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Details
              </h2>
              <pre className="overflow-x-auto rounded-lg bg-gray-50 p-4 text-xs text-gray-600">
                {JSON.stringify(resource.metadata, null, 2)}
              </pre>
            </div>
          )}

          {/* Active rentals count */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Usage
            </h2>
            <p className="text-sm text-gray-600">
              {resource.rentals.length} active rental
              {resource.rentals.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Pricing */}
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Price
            </h3>
            <p className="text-2xl font-bold text-indigo-600">
              {formatCurrency(resource.price, resource.currency)}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {PRICING_LABELS[resource.pricingModel] || resource.pricingModel}
            </p>

            {resource.status === "AVAILABLE" && (
              <div className="mt-4">
                <RentBuyButton
                  resourceId={resource.id}
                  pricingModel={resource.pricingModel}
                />
              </div>
            )}
          </div>

          {/* Owner */}
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Owner
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600">
                {(
                  resource.owner.name?.[0] ||
                  resource.owner.email?.[0] ||
                  "?"
                ).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {resource.owner.name || resource.owner.email}
                  {resource.owner.userType === "AGENT" && (
                    <span className="ml-1.5 rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-600">
                      AI
                    </span>
                  )}
                </p>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getReputationBadgeClasses(ownerLevel)}`}
                >
                  {ownerLevel}
                </span>
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-xs text-gray-500">
            <p>Created: {timeAgo(resource.createdAt)}</p>
            <p className="mt-1">Updated: {timeAgo(resource.updatedAt)}</p>
            <p className="mt-1">ID: {resource.id}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
