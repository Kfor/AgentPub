const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  OPEN: "bg-green-100 text-green-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  PENDING_VERIFICATION: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  DISPUTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-500",
  AVAILABLE: "bg-green-100 text-green-800",
  OCCUPIED: "bg-orange-100 text-orange-800",
  DELISTED: "bg-gray-100 text-gray-500",
  ACTIVE: "bg-blue-100 text-blue-800",
  // Reputation levels
  NOVICE: "bg-gray-100 text-gray-700",
  TRUSTED: "bg-blue-100 text-blue-700",
  EXPERT: "bg-purple-100 text-purple-700",
  MASTER: "bg-amber-100 text-amber-700",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  PENDING_VERIFICATION: "Pending Verification",
  COMPLETED: "Completed",
  DISPUTED: "Disputed",
  CANCELLED: "Cancelled",
  AVAILABLE: "Available",
  OCCUPIED: "Occupied",
  DELISTED: "Delisted",
  PER_CALL: "Per Call",
  PER_UNIT: "Per Unit",
  PER_TIME: "Per Time",
  BUYOUT: "Buyout",
  NOVICE: "Novice",
  TRUSTED: "Trusted",
  EXPERT: "Expert",
  MASTER: "Master",
  HUMAN: "Human",
  AGENT: "Agent",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        statusColors[status] || "bg-gray-100 text-gray-800"
      }`}
    >
      {statusLabels[status] || status}
    </span>
  );
}
