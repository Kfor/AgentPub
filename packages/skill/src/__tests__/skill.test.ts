import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSkillDefinition, executeToolCall } from "../skill";
import { AgentPubClient } from "../client";

describe("getSkillDefinition", () => {
  it("returns valid skill definition with all tools", () => {
    const def = getSkillDefinition();
    expect(def.name).toBe("agentpub");
    expect(def.version).toBe("0.1.0");

    const toolNames = def.tools.map((t) => t.name);
    expect(toolNames).toContain("agentpub_get_wallet");
    expect(toolNames).toContain("agentpub_set_wallet_address");
    expect(toolNames).toContain("agentpub_list_tasks");
    expect(toolNames).toContain("agentpub_get_task");
    expect(toolNames).toContain("agentpub_create_task");
    expect(toolNames).toContain("agentpub_place_bid");
    expect(toolNames).toContain("agentpub_accept_bid");
    expect(toolNames).toContain("agentpub_submit_delivery");
    expect(toolNames).toContain("agentpub_list_resources");
    expect(toolNames).toContain("agentpub_create_resource");
    expect(toolNames).toContain("agentpub_rent_resource");
    expect(toolNames).toContain("agentpub_get_income");
  });

  it("each tool has name, description, and parameters", () => {
    const def = getSkillDefinition();
    for (const tool of def.tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.parameters).toBeTruthy();
    }
  });
});

describe("executeToolCall", () => {
  let client: AgentPubClient;

  beforeEach(() => {
    client = new AgentPubClient({
      baseUrl: "https://agentpub.example.com",
      apiKey: "test-key",
    });
    vi.restoreAllMocks();
  });

  function mockFetch(data: unknown, status = 200) {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(data), { status })
    );
  }

  it("dispatches agentpub_get_wallet", async () => {
    const walletData = { walletAddress: null, balance: 0, escrowedAmount: 0, pendingEarnings: 0, recentTransactions: [] };
    mockFetch(walletData);
    const result = await executeToolCall(client, "agentpub_get_wallet", {});
    expect(result).toEqual(walletData);
  });

  it("dispatches agentpub_list_tasks with params", async () => {
    const tasksData = { tasks: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    mockFetch(tasksData);
    const result = await executeToolCall(client, "agentpub_list_tasks", {
      status: "OPEN",
      category: "code",
    });
    expect(result).toEqual(tasksData);
  });

  it("dispatches agentpub_place_bid", async () => {
    mockFetch({ id: "b1", amount: 100 }, 201);
    const result = await executeToolCall(client, "agentpub_place_bid", {
      taskId: "t1",
      amount: 100,
      proposal: "I can do this",
    });
    expect(result).toHaveProperty("id", "b1");
  });

  it("dispatches agentpub_submit_delivery", async () => {
    mockFetch({ delivery: { id: "d1" }, verification: { auto: false } }, 201);
    const result = await executeToolCall(client, "agentpub_submit_delivery", {
      taskId: "t1",
      content: "Done!",
    });
    expect(result).toHaveProperty("delivery");
  });

  it("dispatches agentpub_rent_resource", async () => {
    mockFetch({ rental: { id: "rn1" }, totalCost: 5, platformFee: 0.25 }, 201);
    const result = await executeToolCall(client, "agentpub_rent_resource", {
      resourceId: "r1",
      units: 10,
    });
    expect(result).toHaveProperty("totalCost", 5);
  });

  it("throws on unknown tool", async () => {
    await expect(
      executeToolCall(client, "unknown_tool", {})
    ).rejects.toThrow("Unknown tool: unknown_tool");
  });
});
