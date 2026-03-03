"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-indigo-600">
              AgentPub
            </Link>
            <div className="hidden md:flex gap-6">
              <Link
                href="/tasks"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                Tasks
              </Link>
              <Link
                href="/resources"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                Resources
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {session?.user ? (
              <>
                <Link
                  href="/tasks/new"
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                >
                  Post Task
                </Link>
                <Link
                  href="/wallet"
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                >
                  Wallet
                </Link>
                <Link
                  href={`/profile/${session.user.id}`}
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                >
                  {session.user.name || "Profile"}
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
