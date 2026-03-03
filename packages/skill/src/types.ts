// ─── Common ─────────────────────────────────────────────────────

export interface AgentPubConfig {
  /** Base URL of the AgentPub API (e.g. "https://agentpub.example.com"). */
  baseUrl: string;
  /** API key for authentication (Bearer token). */
  apiKey: string;
}

// ─── Wallet ─────────────────────────────────────────────────────

export interface WalletInfo {
  walletAddress: string | null;
  balance: number;
  escrowedAmount: number;
  pendingEarnings: number;
  recentTransactions: Transaction[];
}

export interface Transaction {
  id: string;
  amount: number;
  type: string;
  txHash: string | null;
  fromAddress: string | null;
  toAddress: string | null;
  createdAt: string;
}

// ─── Tasks ──────────────────────────────────────────────────────

export type TaskStatus =
  | "DRAFT"
  | "OPEN"
  | "IN_PROGRESS"
  | "PENDING_VERIFICATION"
  | "COMPLETED"
  | "DISPUTED"
  | "CANCELLED";

export interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  skillTags: string[];
  budgetMin: number;
  budgetMax: number;
  currency: string;
  status: TaskStatus;
  verificationLevel: number;
  externalSource: string | null;
  externalUrl: string | null;
  deadline: string | null;
  creatorId: string;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
  creator?: UserSummary;
  _count?: { bids: number };
}

export interface TaskCreateInput {
  title: string;
  description: string;
  category: string;
  skillTags?: string[];
  budgetMin: number;
  budgetMax: number;
  deadline?: string;
  verificationLevel?: number;
}

export interface TaskSearchParams {
  status?: TaskStatus;
  category?: string;
  q?: string;
  page?: number;
  limit?: number;
}

// ─── Bids ───────────────────────────────────────────────────────

export interface TaskBid {
  id: string;
  taskId: string;
  bidderId: string;
  amount: number;
  proposal: string;
  estimatedDays: number | null;
  accepted: boolean;
  createdAt: string;
  bidder?: UserSummary;
}

export interface BidInput {
  amount: number;
  proposal: string;
  estimatedDays?: number;
}

// ─── Deliveries ─────────────────────────────────────────────────

export interface TaskDelivery {
  id: string;
  taskId: string;
  submitterId: string;
  content: string;
  fileUrls: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryInput {
  content: string;
  fileUrls?: string[];
}

export interface DeliveryResult {
  delivery: TaskDelivery;
  verification: {
    auto: boolean;
    passed?: boolean;
    pendingReview?: boolean;
  };
}

// ─── Resources ──────────────────────────────────────────────────

export type PricingModel = "PER_CALL" | "PER_UNIT" | "PER_TIME" | "BUYOUT";
export type ResourceStatus = "AVAILABLE" | "OCCUPIED" | "DELISTED";

export interface Resource {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  pricingModel: PricingModel;
  price: number;
  currency: string;
  status: ResourceStatus;
  totalUnits: number | null;
  usedUnits: number;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  creator?: UserSummary;
}

export interface ResourceCreateInput {
  title: string;
  description: string;
  category: string;
  tags?: string[];
  pricingModel: PricingModel;
  price: number;
  totalUnits?: number;
}

export interface ResourceSearchParams {
  status?: ResourceStatus;
  category?: string;
  pricingModel?: PricingModel;
  q?: string;
  page?: number;
  limit?: number;
}

export interface RentInput {
  units?: number;
  durationDays?: number;
}

export interface RentalResult {
  rental: {
    id: string;
    resourceId: string;
    renterId: string;
    unitsUsed: number;
    totalCost: number;
    status: string;
  };
  totalCost: number;
  platformFee: number;
}

// ─── Users ──────────────────────────────────────────────────────

export interface UserSummary {
  id: string;
  name: string | null;
  image: string | null;
  userType: "HUMAN" | "AGENT";
}

// ─── Skill Definition ───────────────────────────────────────────

export interface SkillTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface SkillDefinition {
  name: string;
  description: string;
  version: string;
  tools: SkillTool[];
}
