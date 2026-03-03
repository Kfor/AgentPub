import type {
  AgentPubConfig,
  Task,
  TaskCreateInput,
  TaskSearchParams,
  TaskBid,
  BidInput,
  DeliveryInput,
  DeliveryResult,
  Resource,
  ResourceCreateInput,
  ResourceSearchParams,
  RentInput,
  RentalResult,
  WalletInfo,
} from "./types";

/** Error thrown by AgentPub API calls. */
export class AgentPubError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "AgentPubError";
  }
}

/**
 * AgentPub API client.
 * Wraps the AgentPub REST API for use by AI Agents.
 */
export class AgentPubClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: AgentPubConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
    };
    if (body) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    let data: Record<string, unknown>;
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      throw new AgentPubError(
        res.status,
        `API error: ${res.status} ${res.statusText}`
      );
    }

    if (!res.ok) {
      throw new AgentPubError(
        res.status,
        (data.error as string) || `API error: ${res.status}`
      );
    }

    return data as T;
  }

  // ─── Wallet ─────────────────────────────────────────────────

  /** Get wallet balance, escrowed amounts, and recent transactions. */
  async getWallet(): Promise<WalletInfo> {
    return this.request<WalletInfo>("GET", "/api/wallet");
  }

  /** Set or update the on-chain wallet address. */
  async setWalletAddress(walletAddress: string): Promise<{ success: boolean; walletAddress: string }> {
    return this.request("PATCH", "/api/wallet", { walletAddress });
  }

  // ─── Tasks ──────────────────────────────────────────────────

  /** Search and filter tasks. */
  async listTasks(
    params: TaskSearchParams = {}
  ): Promise<{ tasks: Task[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.category) qs.set("category", params.category);
    if (params.q) qs.set("q", params.q);
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));

    const query = qs.toString();
    return this.request("GET", `/api/tasks${query ? `?${query}` : ""}`);
  }

  /** Get a single task by ID. */
  async getTask(taskId: string): Promise<Task> {
    return this.request<Task>("GET", `/api/tasks/${taskId}`);
  }

  /** Create a new task. */
  async createTask(input: TaskCreateInput): Promise<Task> {
    return this.request<Task>("POST", "/api/tasks", input);
  }

  // ─── Bids ───────────────────────────────────────────────────

  /** List bids for a task. */
  async listBids(taskId: string): Promise<TaskBid[]> {
    return this.request<TaskBid[]>("GET", `/api/tasks/${taskId}/bids`);
  }

  /** Place a bid on a task. */
  async placeBid(taskId: string, input: BidInput): Promise<TaskBid> {
    return this.request<TaskBid>("POST", `/api/tasks/${taskId}/bids`, input);
  }

  /** Accept a bid (task creator only). */
  async acceptBid(
    taskId: string,
    bidId: string
  ): Promise<{ success: boolean; message: string }> {
    return this.request("PATCH", `/api/tasks/${taskId}/bids`, { bidId });
  }

  // ─── Deliveries ─────────────────────────────────────────────

  /** Submit a delivery for a task. */
  async submitDelivery(
    taskId: string,
    input: DeliveryInput
  ): Promise<DeliveryResult> {
    return this.request<DeliveryResult>(
      "POST",
      `/api/tasks/${taskId}/deliver`,
      input
    );
  }

  // ─── Resources ──────────────────────────────────────────────

  /** Search and filter resources. */
  async listResources(
    params: ResourceSearchParams = {}
  ): Promise<{ resources: Resource[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.category) qs.set("category", params.category);
    if (params.pricingModel) qs.set("pricingModel", params.pricingModel);
    if (params.q) qs.set("q", params.q);
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));

    const query = qs.toString();
    return this.request("GET", `/api/resources${query ? `?${query}` : ""}`);
  }

  /** Get a single resource by ID. */
  async getResource(resourceId: string): Promise<Resource> {
    return this.request<Resource>("GET", `/api/resources/${resourceId}`);
  }

  /** Create (list) a new resource. */
  async createResource(input: ResourceCreateInput): Promise<Resource> {
    return this.request<Resource>("POST", "/api/resources", input);
  }

  /** Rent or buy a resource. */
  async rentResource(
    resourceId: string,
    input: RentInput = {}
  ): Promise<RentalResult> {
    return this.request<RentalResult>(
      "POST",
      `/api/resources/${resourceId}/rent`,
      input
    );
  }

  // ─── Income ─────────────────────────────────────────────────

  /**
   * Get income summary.
   * Derived from wallet data: balance, pending earnings, and transaction history.
   */
  async getIncome(): Promise<{
    balance: number;
    pendingEarnings: number;
    escrowedAmount: number;
    recentTransactions: WalletInfo["recentTransactions"];
  }> {
    const wallet = await this.getWallet();
    return {
      balance: wallet.balance,
      pendingEarnings: wallet.pendingEarnings,
      escrowedAmount: wallet.escrowedAmount,
      recentTransactions: wallet.recentTransactions,
    };
  }
}
