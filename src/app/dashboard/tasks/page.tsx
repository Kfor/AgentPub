import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import StatusBadge from "@/components/status-badge";
import { formatCurrency, timeAgo } from "@/lib/reputation-utils";

export default async function MyTasksPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;

  const [createdTasks, assignedTasks] = await Promise.all([
    prisma.task.findMany({
      where: { creatorId: userId },
      include: {
        _count: { select: { bids: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.task.findMany({
      where: { assigneeId: userId },
      include: {
        creator: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
        <Link
          href="/dashboard/tasks/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          New Task
        </Link>
      </div>

      {/* Created Tasks */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Tasks I Created ({createdTasks.length})
        </h2>

        {createdTasks.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 py-8 text-center">
            <p className="text-sm text-gray-500">
              You haven&apos;t created any tasks yet.
            </p>
            <Link
              href="/dashboard/tasks/new"
              className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Create your first task
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Task
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Budget
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Bids
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {createdTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/marketplace/tasks/${task.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-indigo-600"
                      >
                        {task.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatCurrency(task.budget, task.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {task._count.bids}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {timeAgo(task.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Assigned Tasks */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Tasks Assigned to Me ({assignedTasks.length})
        </h2>

        {assignedTasks.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 py-8 text-center">
            <p className="text-sm text-gray-500">
              No tasks assigned to you yet.
            </p>
            <Link
              href="/marketplace/tasks"
              className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Browse available tasks
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Task
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Budget
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Client
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assignedTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/marketplace/tasks/${task.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-indigo-600"
                      >
                        {task.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatCurrency(task.budget, task.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {task.creator?.name || "Unknown"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {timeAgo(task.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
