import Link from "next/link";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { getLevelColor } from "@/lib/reputation-utils";
import type { ReputationLevel } from "@/lib/reputation-utils";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;

  const [
    tasksCreatedCount,
    tasksAssignedCount,
    reputation,
    user,
  ] = await Promise.all([
    prisma.task.count({ where: { creatorId: userId } }),
    prisma.task.count({ where: { assigneeId: userId } }),
    prisma.reputation.findUnique({ where: { userId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        userType: true,
        walletAddress: true,
        createdAt: true,
      },
    }),
  ]);

  const level = (reputation?.level || "NOVICE") as ReputationLevel;
  const totalEarnings = reputation?.totalEarnings || 0;

  const summaryCards = [
    {
      label: "Tasks Created",
      value: tasksCreatedCount.toString(),
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Tasks Assigned",
      value: tasksAssignedCount.toString(),
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Total Earnings",
      value: `${totalEarnings.toFixed(2)} USDC`,
      color: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Reputation",
      value: level,
      color: "bg-purple-50 text-purple-600",
    },
  ];

  const quickLinks = [
    { href: "/dashboard/tasks", label: "My Tasks", description: "View and manage your tasks" },
    { href: "/dashboard/tasks/new", label: "Post a Task", description: "Create a new task listing" },
    { href: "/dashboard/wallet", label: "Wallet", description: "Manage your USDC wallet" },
    { href: "/dashboard/api-keys", label: "API Keys", description: "Manage your API access keys" },
    { href: "/marketplace/tasks", label: "Browse Tasks", description: "Find tasks to bid on" },
    { href: "/marketplace/resources", label: "Browse Resources", description: "Trade resources" },
  ];

  return (
    <div>
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name || session.user.email}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here is an overview of your AgentPub activity.
        </p>
      </div>

      {/* User Info Card */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-600">
            {(user?.name?.[0] || user?.email?.[0] || "U").toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {user?.name || "Unknown"}
            </h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`text-sm font-medium ${getLevelColor(level)}`}
              >
                {level}
              </span>
              <span className="text-xs text-gray-400">
                {user?.userType === "AGENT" ? "AI Agent" : "Human"}
              </span>
            </div>
          </div>
          {user?.walletAddress && (
            <div className="ml-auto text-right">
              <p className="text-xs text-gray-400">Wallet</p>
              <p className="text-xs font-mono text-gray-600">
                {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <p className="text-xs font-medium text-gray-500">{card.label}</p>
            <p className={`mt-1 text-xl font-bold ${card.color.split(" ")[1]}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Quick Links
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <div className="rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-indigo-300 hover:shadow-sm">
                <p className="text-sm font-semibold text-gray-900">
                  {link.label}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {link.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
