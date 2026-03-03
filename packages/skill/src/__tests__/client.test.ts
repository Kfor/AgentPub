import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentPubClient, AgentPubError } from "../client";

const BASE_URL = "https://agentpub.example.com";
const API_KEY = "test-api-key-123";

function createClient() {
  return new AgentPubClient({ baseUrl: BASE_URL, apiKey: API_KEY });
}

function mockFetch(data: unknown, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify(data), { status })
  );
}

describe("AgentPubClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("auth", () => {
    it("sends Bearer token in Authorization header", async () => {
      const spy = mockFetch({ walletAddress: null, balance: 0, escrowedAmount: 0, pendingEarnings: 0, recentTransactions: [] });
      const client = createClient();
      await client.getWallet();

      const [, init] = spy.mock.calls[0];
      expect(init?.headers).toEqual(
        expect.objectContaining({
          Authorization: `Bearer ${API_KEY}`,
        })
      );
    });
  });

  describe("error handling", () => {
    it("throws AgentPubError on non-OK response", async () => {
      mockFetch({ error: "Unauthorized" }, 401);
      const client = createClient();
      await expect(client.getWallet()).rejects.toThrow(AgentPubError);
    });

    it("includes status code and message in error", async () => {
      mockFetch({ error: "Not found" }, 404);
      const client = createClient();
      try {
        await client.getWallet();
        expect.fail("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(AgentPubError);
        expect((e as AgentPubError).statusCode).toBe(404);
        expect((e as AgentPubError).message).toBe("Not found");
      }
    });
  });

  describe("wallet", () => {
    it("getWallet calls GET /api/wallet", async () => {
      const walletData = { walletAddress: "0x123", balance: 100, escrowedAmount: 20, pendingEarnings: 10, recentTransactions: [] };
      const spy = mockFetch(walletData);
      const client = createClient();
      const result = await client.getWallet();

      expect(spy).toHaveBeenCalledWith(
        `${BASE_URL}/api/wallet`,
        expect.objectContaining({ method: "GET" })
      );
      expect(result.balance).toBe(100);
    });

    it("setWalletAddress calls PATCH /api/wallet", async () => {
      const spy = mockFetch({ success: true, walletAddress: "0xabc" });
      const client = createClient();
      await client.setWalletAddress("0xabc");

      expect(spy).toHaveBeenCalledWith(
        `${BASE_URL}/api/wallet`,
        expect.objectContaining({ method: "PATCH" })
      );
    });
  });

  describe("tasks", () => {
    it("listTasks with filters builds query string", async () => {
      const spy = mockFetch({ tasks: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
      const client = createClient();
      await client.listTasks({ status: "OPEN", category: "code", q: "python" });

      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain("status=OPEN");
      expect(url).toContain("category=code");
      expect(url).toContain("q=python");
    });

    it("getTask calls GET /api/tasks/:id", async () => {
      const task = { id: "t1", title: "Test", status: "OPEN" };
      const spy = mockFetch(task);
      const client = createClient();
      const result = await client.getTask("t1");

      expect(spy).toHaveBeenCalledWith(
        `${BASE_URL}/api/tasks/t1`,
        expect.objectContaining({ method: "GET" })
      );
      expect(result.id).toBe("t1");
    });

    it("createTask calls POST /api/tasks", async () => {
      const newTask = { id: "t2", title: "New Task" };
      const spy = mockFetch(newTask, 201);
      const client = createClient();
      await client.createTask({
        title: "New Task",
        description: "Desc",
        category: "code",
        budgetMin: 100,
        budgetMax: 200,
      });

      expect(spy).toHaveBeenCalledWith(
        `${BASE_URL}/api/tasks`,
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  describe("bids", () => {
    it("placeBid calls POST /api/tasks/:id/bids", async () => {
      const spy = mockFetch({ id: "b1", amount: 150 }, 201);
      const client = createClient();
      await client.placeBid("t1", { amount: 150, proposal: "I can do this" });

      expect(spy).toHaveBeenCalledWith(
        `${BASE_URL}/api/tasks/t1/bids`,
        expect.objectContaining({ method: "POST" })
      );
    });

    it("acceptBid calls PATCH /api/tasks/:id/bids", async () => {
      const spy = mockFetch({ success: true });
      const client = createClient();
      await client.acceptBid("t1", "b1");

      expect(spy).toHaveBeenCalledWith(
        `${BASE_URL}/api/tasks/t1/bids`,
        expect.objectContaining({ method: "PATCH" })
      );
    });
  });

  describe("deliveries", () => {
    it("submitDelivery calls POST /api/tasks/:id/deliver", async () => {
      const spy = mockFetch({ delivery: { id: "d1" }, verification: { auto: false, pendingReview: true } }, 201);
      const client = createClient();
      await client.submitDelivery("t1", { content: "Here is the result" });

      expect(spy).toHaveBeenCalledWith(
        `${BASE_URL}/api/tasks/t1/deliver`,
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  describe("resources", () => {
    it("listResources with filters", async () => {
      const spy = mockFetch({ resources: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
      const client = createClient();
      await client.listResources({ pricingModel: "PER_CALL", category: "api" });

      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain("pricingModel=PER_CALL");
      expect(url).toContain("category=api");
    });

    it("createResource calls POST /api/resources", async () => {
      const spy = mockFetch({ id: "r1" }, 201);
      const client = createClient();
      await client.createResource({
        title: "GPT-4 API",
        description: "OpenAI API access",
        category: "api",
        pricingModel: "PER_CALL",
        price: 0.5,
      });

      expect(spy).toHaveBeenCalledWith(
        `${BASE_URL}/api/resources`,
        expect.objectContaining({ method: "POST" })
      );
    });

    it("rentResource calls POST /api/resources/:id/rent", async () => {
      const spy = mockFetch({ rental: { id: "rn1" }, totalCost: 10, platformFee: 0.5 }, 201);
      const client = createClient();
      await client.rentResource("r1", { units: 10 });

      expect(spy).toHaveBeenCalledWith(
        `${BASE_URL}/api/resources/r1/rent`,
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  describe("income", () => {
    it("getIncome returns wallet-derived income data", async () => {
      const walletData = { walletAddress: "0x1", balance: 500, escrowedAmount: 50, pendingEarnings: 100, recentTransactions: [{ id: "tx1", amount: 50, type: "ESCROW_RELEASE" }] };
      mockFetch(walletData);
      const client = createClient();
      const income = await client.getIncome();

      expect(income.balance).toBe(500);
      expect(income.pendingEarnings).toBe(100);
      expect(income.recentTransactions).toHaveLength(1);
    });
  });
});
