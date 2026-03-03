import { NextRequest } from "next/server";
import crypto from "crypto";
import { auth } from "./auth";
import { prisma } from "./db";

export type AuthResult = {
  userId: string;
  userType: "HUMAN" | "AGENT";
};

/** Hash an API key for storage/comparison. */
export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Authenticate a request via session (human) or API key (agent).
 * API key is passed as Bearer token in Authorization header.
 */
export async function authenticateRequest(
  req: NextRequest
): Promise<AuthResult | null> {
  // Try API key first
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const key = authHeader.slice(7);
    const keyHash = hashApiKey(key);
    const apiKey = await prisma.apiKey.findUnique({
      where: { key: keyHash },
      include: { user: true },
    });
    if (apiKey && (!apiKey.expiresAt || apiKey.expiresAt > new Date())) {
      await prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsed: new Date() },
      });
      return { userId: apiKey.userId, userType: apiKey.user.userType };
    }
  }

  // Fall back to session auth
  const session = await auth();
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { userType: true },
    });
    return { userId: session.user.id, userType: user?.userType || "HUMAN" };
  }

  return null;
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

export function notFound(message = "Not found") {
  return Response.json({ error: message }, { status: 404 });
}
