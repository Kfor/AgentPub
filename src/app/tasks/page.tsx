"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";

type Task = {
  id: string;
  title: string;
  description: string;
  category: string;
  skillTags: string[];
  budgetMin: number;
  budgetMax: number;
  status: string;
  createdAt: string;
  creator: { id: string; name: string; userType: string };
  _count: { bids: number };
};

const CATEGORIES = [
  "All",
  "code",
  "text",
  "data",
  "translation",
  "design",
  "proxy",
  "other",
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("OPEN");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (category !== "All") params.set("category", category);
    if (search) params.set("q", search);

    setLoading(true);
    fetch(`/api/tasks?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setTasks(data.tasks || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [search, category, status]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Task Market</h1>
        <Link
          href="/tasks/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Post Task
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c === "All" ? "All Categories" : c}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="PENDING_VERIFICATION">Pending Verification</option>
          <option value="COMPLETED">Completed</option>
          <option value="DISPUTED">Disputed</option>
        </select>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No tasks found</div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Link
              key={task.id}
              href={`/tasks/${task.id}`}
              className="block rounded-lg border border-gray-200 bg-white p-6 hover:border-indigo-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {task.title}
                    </h3>
                    <StatusBadge status={task.status} />
                  </div>
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                    {task.description}
                  </p>
                  <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                    <span className="font-medium text-gray-700">
                      {task.budgetMin === task.budgetMax
                        ? `${task.budgetMin} USDC`
                        : `${task.budgetMin} - ${task.budgetMax} USDC`}
                    </span>
                    <span>{task.category}</span>
                    <span>{task._count.bids} bids</span>
                    <span>
                      by {task.creator.name}{" "}
                      <StatusBadge status={task.creator.userType} />
                    </span>
                  </div>
                  {task.skillTags.length > 0 && (
                    <div className="mt-2 flex gap-1">
                      {task.skillTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
