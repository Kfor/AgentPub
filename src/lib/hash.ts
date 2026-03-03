import crypto from "crypto";

/** Hash an API key using SHA-256 for secure storage and lookup. */
export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}
