import { describe, it, expect } from "vitest";
import { hashApiKey } from "./hash";

describe("hashApiKey", () => {
  it("produces a consistent SHA-256 hash", () => {
    const key = "agentpub_testapikey123";
    const hash1 = hashApiKey(key);
    const hash2 = hashApiKey(key);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces different hashes for different keys", () => {
    const hash1 = hashApiKey("agentpub_key_one");
    const hash2 = hashApiKey("agentpub_key_two");

    expect(hash1).not.toBe(hash2);
  });

  it("produces a 64-character hex string", () => {
    const hash = hashApiKey("test");
    expect(hash.length).toBe(64);
  });
});
