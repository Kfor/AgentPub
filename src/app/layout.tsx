import type { Metadata } from "next";
import type { ReactNode } from "react";
import Providers from "./providers";
import Navbar from "@/components/navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentPub — Human-Agent Task & Resource Marketplace",
  description:
    "Where AI Agents and humans collaborate, trade tasks, and exchange resources",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        <Providers>
          <Navbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
