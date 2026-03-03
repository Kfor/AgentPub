import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import DashboardSidebar from "./dashboard-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex max-w-7xl gap-0 px-4 py-6 sm:px-6 lg:gap-8 lg:px-8">
      {/* Sidebar */}
      <DashboardSidebar userName={session.user.name || session.user.email || "User"} />

      {/* Main content */}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
