import { describe, it, expect, vi, beforeEach } from "vitest";
import { runSpiderForSource } from "../spider";
import type { ExternalPost, SpiderSourceConfig } from "../types";

// Mock prisma
vi.mock("../../db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    task: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { prisma } from "../../db";

const mockPrisma = prisma as any;

const config: SpiderSourceConfig = {
  name: "reddit:r/forhire",
  subreddit: "forhire",
  limit: 10,
};

const mockPosts: ExternalPost[] = [
  {
    id: "p1",
    title: "[Hiring] Python developer needed",
    body: "Need a Python script for data processing. Budget: $100-$200.",
    author: "user1",
    url: "https://reddit.com/r/forhire/p1",
    source: "reddit:r/forhire",
    createdAt: new Date(),
  },
  {
    id: "p2",
    title: "[Hiring] React frontend developer",
    body: "Build a React dashboard. $500.",
    author: "user2",
    url: "https://reddit.com/r/forhire/p2",
    source: "reddit:r/forhire",
    createdAt: new Date(),
  },
];

describe("runSpiderForSource", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Spider user exists
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "spider-user",
      email: "spider@agentpub.local",
      name: "AgentPub Spider",
      userType: "AGENT",
    } as never);
  });

  it("creates draft tasks for new posts", async () => {
    // No existing tasks (no duplicates)
    mockPrisma.task.findFirst.mockResolvedValue(null);
    mockPrisma.task.create.mockResolvedValue({ id: "task-1" } as never);

    const fetchFn = vi.fn().mockResolvedValue(mockPosts);
    const result = await runSpiderForSource(config, fetchFn);

    expect(result.source).toBe("reddit:r/forhire");
    expect(result.fetched).toBe(2);
    expect(result.created).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);

    // Verify tasks were created as DRAFT
    expect(mockPrisma.task.create).toHaveBeenCalledTimes(2);
    const createCall = mockPrisma.task.create.mock.calls[0][0];
    expect(createCall.data.status).toBe("DRAFT");
    expect(createCall.data.externalSource).toBe("reddit:r/forhire");
  });

  it("skips duplicate posts by externalUrl", async () => {
    // First post is a duplicate
    mockPrisma.task.findFirst
      .mockResolvedValueOnce({ id: "existing" } as never)
      .mockResolvedValueOnce(null);
    mockPrisma.task.create.mockResolvedValue({ id: "task-new" } as never);

    const fetchFn = vi.fn().mockResolvedValue(mockPosts);
    const result = await runSpiderForSource(config, fetchFn);

    expect(result.created).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it("handles fetch errors gracefully", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("Network error"));
    const result = await runSpiderForSource(config, fetchFn);

    expect(result.fetched).toBe(0);
    expect(result.created).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Network error");
  });

  it("creates spider user if not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "new-spider",
      email: "spider@agentpub.local",
    } as never);
    mockPrisma.task.findFirst.mockResolvedValue(null);
    mockPrisma.task.create.mockResolvedValue({ id: "t1" } as never);

    const fetchFn = vi.fn().mockResolvedValue([mockPosts[0]]);
    await runSpiderForSource(config, fetchFn);

    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: {
        email: "spider@agentpub.local",
        name: "AgentPub Spider",
        userType: "AGENT",
      },
    });
  });
});
