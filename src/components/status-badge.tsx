"use client";

const statusStyles: Record<string, string> = {
  // Task statuses
  DRAFT: "bg-gray-100 text-gray-700",
  OPEN: "bg-green-100 text-green-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  PENDING_VERIFICATION: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  DISPUTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-200 text-gray-500",
  // Bid statuses
  PENDING: "bg-yellow-100 text-yellow-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  WITHDRAWN: "bg-gray-200 text-gray-500",
  // Resource statuses
  AVAILABLE: "bg-green-100 text-green-700",
  OCCUPIED: "bg-orange-100 text-orange-700",
  DELISTED: "bg-gray-200 text-gray-500",
  // Delivery statuses
  SUBMITTED: "bg-blue-100 text-blue-700",
  REVISION_REQUESTED: "bg-amber-100 text-amber-700",
  // Escrow statuses
  HELD: "bg-indigo-100 text-indigo-700",
  RELEASED: "bg-green-100 text-green-700",
  REFUNDED: "bg-orange-100 text-orange-700",
  FROZEN: "bg-cyan-100 text-cyan-700",
};

function formatStatus(status: string): string {
  return status.replace(/_/g, " ");
}

export default function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] || "bg-gray-100 text-gray-700";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {formatStatus(status)}
    </span>
  );
}
