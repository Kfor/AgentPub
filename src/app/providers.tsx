"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Client-side providers wrapper.
 *
 * Wraps the application with NextAuth SessionProvider so that
 * useSession() and other NextAuth client hooks work throughout
 * the component tree.
 */
export default function Providers({ children }: ProvidersProps) {
  return <SessionProvider>{children}</SessionProvider>;
}
