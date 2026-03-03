import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import type { User } from "@prisma/client";
export { hashApiKey } from "@/lib/hash";
import { hashApiKey } from "@/lib/hash";

/**
 * Authenticate an incoming request using an API key from the Authorization header.
 *
 * Expects the header format: `Authorization: Bearer <api-key>`
 *
 * Validates that the key exists, is not revoked, and has not expired.
 * On success, updates the `lastUsed` timestamp and returns the associated User.
 */
export async function authenticateApiKey(
  request: Request
): Promise<User | null> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const key = authHeader.slice("Bearer ".length).trim();

  if (!key) {
    return null;
  }

  // Look up by hash of the key
  const keyHash = hashApiKey(key);

  const apiKey = await prisma.apiKey.findUnique({
    where: { key: keyHash },
    include: { user: true },
  });

  if (!apiKey) {
    return null;
  }

  if (apiKey.revoked) {
    return null;
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return null;
  }

  // Update lastUsed timestamp (fire-and-forget to avoid blocking the request)
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsed: new Date() },
    })
    .catch((err) => {
      console.error("Failed to update API key lastUsed timestamp:", err);
    });

  return apiKey.user;
}

/**
 * Authenticate a request using either session auth (NextAuth) or API key auth.
 *
 * Tries session-based authentication first. If no session is found, falls back
 * to API key authentication from the Authorization header.
 *
 * Returns the authenticated User or null if neither method succeeds.
 */
export async function requireAuth(request: Request): Promise<User | null> {
  // Try session auth first (NextAuth v5)
  const session = await auth();

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (user) {
      return user;
    }
  }

  // Fall back to API key auth
  return authenticateApiKey(request);
}
