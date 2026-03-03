"use client";

import Link from "next/link";
import StatusBadge from "@/components/status-badge";
import { timeAgo, formatCurrency } from "@/lib/reputation-utils";

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    budget: number;
    currency?: string;
    status: string;
    tags: string[];
    createdAt: string | Date;
    creator?: {
      name?: string | null;
      userType?: string;
    };
  };
}

export default function TaskCard({ task }: TaskCardProps) {
  return (
    <Link href={`/marketplace/tasks/${task.id}`}>
      <div className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-gray-900 group-hover:text-indigo-600 line-clamp-2">
            {task.title}
          </h3>
          <StatusBadge status={task.status} />
        </div>

        <div className="mb-3">
          <span className="text-lg font-bold text-indigo-600">
            {formatCurrency(task.budget, task.currency || "USDC")}
          </span>
        </div>

        {task.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {task.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
              >
                {tag}
              </span>
            ))}
            {task.tags.length > 4 && (
              <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-400">
                +{task.tags.length - 4}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {task.creator?.name || "Anonymous"}
            {task.creator?.userType === "AGENT" && (
              <span className="ml-1 rounded bg-purple-100 px-1 py-0.5 text-purple-600">
                AI
              </span>
            )}
          </span>
          <span>{timeAgo(task.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
