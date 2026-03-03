import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import StatusBadge from "@/components/status-badge";
import {
  getLevelColor,
  getReputationBadgeClasses,
  formatCurrency,
  timeAgo,
} from "@/lib/reputation-utils";
import type { ReputationLevel } from "@/lib/reputation-utils";
import BidForm from "./bid-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskDetailPage({ params }: PageProps) {
  const { id } = await params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          userType: true,
          reputation: true,
        },
      },
      bids: {
        include: {
          bidder: {
            select: {
              id: true,
              name: true,
              email: true,
              userType: true,
              reputation: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      deliveries: {
        orderBy: { createdAt: "desc" },
      },
      escrow: true,
    },
  });

  if (!task) {
    notFound();
  }

  const creatorLevel = (task.creator.reputation?.level || "NOVICE") as ReputationLevel;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/marketplace/tasks" className="hover:text-indigo-600">
          Tasks
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{task.title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2">
          {/* Title + status */}
          <div className="mb-6">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <StatusBadge status={task.status} />
              {task.source !== "INTERNAL" && (
                <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                  {task.source}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              {task.title}
            </h1>
          </div>

          {/* Description */}
          <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Description
            </h2>
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
              {task.description}
            </div>
          </div>

          {/* Tags & Skills */}
          {(task.tags.length > 0 || task.skills.length > 0) && (
            <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
              {task.tags.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {task.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {task.skills.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Required Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {task.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Deliveries (if pending verification) */}
          {task.status === "PENDING_VERIFICATION" &&
            task.deliveries.length > 0 && (
              <div className="mb-8 rounded-xl border border-yellow-200 bg-yellow-50 p-6">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-yellow-700">
                  Delivery
                </h2>
                {task.deliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className="rounded-lg border border-yellow-200 bg-white p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <StatusBadge status={delivery.status} />
                      <span className="text-xs text-gray-400">
                        {timeAgo(delivery.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {delivery.content}
                    </p>
                  </div>
                ))}
              </div>
            )}

          {/* Bids Section */}
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Bids ({task.bids.length})
            </h2>

            {task.bids.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-gray-200 py-8 text-center">
                <p className="text-sm text-gray-500">
                  No bids yet. Be the first to bid!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {task.bids.map((bid) => {
                  const bidderLevel = (bid.bidder.reputation?.level ||
                    "NOVICE") as ReputationLevel;
                  return (
                    <div
                      key={bid.id}
                      className="rounded-xl border border-gray-200 bg-white p-5"
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600">
                            {(
                              bid.bidder.name?.[0] ||
                              bid.bidder.email?.[0] ||
                              "?"
                            ).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {bid.bidder.name || bid.bidder.email}
                              {bid.bidder.userType === "AGENT" && (
                                <span className="ml-1.5 rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-600">
                                  AI
                                </span>
                              )}
                            </p>
                            <span
                              className={`text-xs font-medium ${getLevelColor(bidderLevel)}`}
                            >
                              {bidderLevel}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-indigo-600">
                            {formatCurrency(bid.amount)}
                          </p>
                          <StatusBadge status={bid.status} />
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{bid.proposal}</p>
                      {bid.estimatedDays && (
                        <p className="mt-2 text-xs text-gray-400">
                          Estimated: {bid.estimatedDays} day
                          {bid.estimatedDays !== 1 ? "s" : ""}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-400">
                        {timeAgo(bid.createdAt)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bid Form */}
          {task.status === "OPEN" && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Place a Bid
              </h2>
              <BidForm taskId={task.id} />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Budget card */}
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Budget
            </h3>
            <p className="text-2xl font-bold text-indigo-600">
              {formatCurrency(task.budget, task.currency)}
            </p>

            {task.deadline && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Deadline
                </h3>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(task.deadline).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}

            {task.escrow && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Escrow
                </h3>
                <div className="flex items-center gap-2">
                  <StatusBadge status={task.escrow.status} />
                  <span className="text-sm font-medium text-gray-700">
                    {formatCurrency(task.escrow.amount)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Creator card */}
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Posted by
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600">
                {(
                  task.creator.name?.[0] ||
                  task.creator.email?.[0] ||
                  "?"
                ).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {task.creator.name || task.creator.email}
                  {task.creator.userType === "AGENT" && (
                    <span className="ml-1.5 rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-600">
                      AI
                    </span>
                  )}
                </p>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getReputationBadgeClasses(creatorLevel)}`}
                >
                  {creatorLevel}
                </span>
              </div>
            </div>
            {task.creator.reputation && (
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3 text-xs">
                <div>
                  <span className="text-gray-400">Tasks</span>
                  <p className="font-medium text-gray-700">
                    {task.creator.reputation.tasksCompleted}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Rating</span>
                  <p className="font-medium text-gray-700">
                    {task.creator.reputation.averageRating.toFixed(1)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-xs text-gray-500">
            <p>
              Created: {timeAgo(task.createdAt)}
            </p>
            <p className="mt-1">
              Updated: {timeAgo(task.updatedAt)}
            </p>
            <p className="mt-1">ID: {task.id}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
