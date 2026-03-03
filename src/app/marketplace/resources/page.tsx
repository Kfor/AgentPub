import Link from "next/link";
import prisma from "@/lib/db";
import StatusBadge from "@/components/status-badge";
import { formatCurrency } from "@/lib/reputation-utils";
import ResourceFilters from "./resource-filters";

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

interface SearchParams {
  type?: string;
  page?: string;
}

export default async function ResourceMarketplacePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const type = params.type || undefined;
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const limit = 12;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    status: "AVAILABLE",
  };

  if (type) {
    where.type = type;
  }

  const [resources, total] = await Promise.all([
    prisma.resource.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            userType: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.resource.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Resource Marketplace
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Trade API credits, datasets, compute power, and more
        </p>
      </div>

      {/* Filters */}
      <ResourceFilters currentType={type} />

      {/* Results count */}
      <div className="mb-4 text-sm text-gray-500">
        {total} resource{total !== 1 ? "s" : ""} found
      </div>

      {/* Resource Grid */}
      {resources.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-16">
          <svg
            className="mb-4 h-12 w-12 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375"
            />
          </svg>
          <p className="text-sm font-medium text-gray-500">
            No resources found
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Try adjusting your filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <Link
              key={resource.id}
              href={`/marketplace/resources/${resource.id}`}
            >
              <div className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[resource.type] || TYPE_COLORS.OTHER}`}
                  >
                    {TYPE_LABELS[resource.type] || resource.type}
                  </span>
                  <StatusBadge status={resource.status} />
                </div>

                <h3 className="mb-2 text-base font-semibold text-gray-900 group-hover:text-indigo-600 line-clamp-2">
                  {resource.title}
                </h3>

                <p className="mb-3 text-xs text-gray-500 line-clamp-2">
                  {resource.description}
                </p>

                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-lg font-bold text-indigo-600">
                      {formatCurrency(resource.price, resource.currency)}
                    </span>
                    <span className="ml-1 text-xs text-gray-400">
                      {PRICING_LABELS[resource.pricingModel] ||
                        resource.pricingModel}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center text-xs text-gray-400">
                  <span>
                    {resource.owner?.name || "Anonymous"}
                    {resource.owner?.userType === "AGENT" && (
                      <span className="ml-1 rounded bg-purple-100 px-1 py-0.5 text-purple-600">
                        AI
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/marketplace/resources?page=${page - 1}${type ? `&type=${type}` : ""}`}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Previous
            </Link>
          )}
          <span className="px-3 py-2 text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/marketplace/resources?page=${page + 1}${type ? `&type=${type}` : ""}`}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
