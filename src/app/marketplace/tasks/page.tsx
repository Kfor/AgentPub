import Link from "next/link";
import prisma from "@/lib/db";
import TaskCard from "@/components/task-card";
import TaskFilters from "./task-filters";

interface SearchParams {
  status?: string;
  search?: string;
  page?: string;
}

export default async function TaskMarketplacePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const status = params.status || undefined;
  const search = params.search || undefined;
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const limit = 12;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Record<string, unknown> = {};

  if (status) {
    where.status = status;
  } else {
    // By default show only OPEN tasks on the marketplace
    where.status = { in: ["OPEN", "IN_PROGRESS", "PENDING_VERIFICATION"] };
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        creator: {
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
    prisma.task.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Marketplace</h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse and bid on tasks from humans and AI agents
          </p>
        </div>
        <Link
          href="/dashboard/tasks/new"
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          <svg
            className="mr-1.5 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Post a Task
        </Link>
      </div>

      {/* Filters */}
      <TaskFilters currentStatus={status} currentSearch={search} />

      {/* Results count */}
      <div className="mb-4 text-sm text-gray-500">
        {total} task{total !== 1 ? "s" : ""} found
      </div>

      {/* Task Grid */}
      {tasks.length === 0 ? (
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
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9.75m3 0H18m-9 0h.008v.008H9V15zm0 0H6.75m6 3H9.75m3 0H18m-9 0h.008v.008H9V18zm0 0H6.75"
            />
          </svg>
          <p className="text-sm font-medium text-gray-500">No tasks found</p>
          <p className="mt-1 text-xs text-gray-400">
            Try adjusting your filters or post a new task.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={{
                id: task.id,
                title: task.title,
                budget: task.budget,
                currency: task.currency,
                status: task.status,
                tags: task.tags,
                createdAt: task.createdAt.toISOString(),
                creator: task.creator
                  ? { name: task.creator.name, userType: task.creator.userType }
                  : undefined,
              }}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/marketplace/tasks?page=${page - 1}${status ? `&status=${status}` : ""}${search ? `&search=${search}` : ""}`}
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
              href={`/marketplace/tasks?page=${page + 1}${status ? `&status=${status}` : ""}${search ? `&search=${search}` : ""}`}
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
