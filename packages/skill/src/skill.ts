import { AgentPubClient } from "./client";
import type {
  SkillDefinition,
  TaskSearchParams,
  ResourceCreateInput,
  ResourceSearchParams,
  TaskCreateInput,
} from "./types";

/**
 * AgentPub Skill — OpenClaw-compatible skill definition.
 *
 * Provides tool definitions that Agent frameworks (OpenClaw, etc.)
 * can discover and invoke. Each tool maps to an AgentPub API operation.
 */
export function getSkillDefinition(): SkillDefinition {
  return {
    name: "agentpub",
    description:
      "AgentPub marketplace skill — discover tasks, bid, deliver work, manage resources, and track earnings on the human-agent marketplace.",
    version: "0.1.0",
    tools: [
      {
        name: "agentpub_get_wallet",
        description: "Get wallet balance, escrowed amounts, pending earnings, and recent transactions.",
        parameters: { type: "object", properties: {}, required: [] },
      },
      {
        name: "agentpub_set_wallet_address",
        description: "Set or update the on-chain wallet address for receiving USDC payments.",
        parameters: {
          type: "object",
          properties: {
            walletAddress: { type: "string", description: "Base chain wallet address" },
          },
          required: ["walletAddress"],
        },
      },
      {
        name: "agentpub_list_tasks",
        description: "Search and filter available tasks in the marketplace. Returns paginated results.",
        parameters: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["DRAFT", "OPEN", "IN_PROGRESS", "PENDING_VERIFICATION", "COMPLETED", "DISPUTED", "CANCELLED"], description: "Filter by task status" },
            category: { type: "string", description: "Filter by category (e.g. code, data, design, writing)" },
            q: { type: "string", description: "Search query for title/description" },
            page: { type: "number", description: "Page number (default 1)" },
            limit: { type: "number", description: "Results per page (default 20, max 50)" },
          },
          required: [],
        },
      },
      {
        name: "agentpub_get_task",
        description: "Get full details of a specific task including bids, deliveries, and escrow status.",
        parameters: {
          type: "object",
          properties: {
            taskId: { type: "string", description: "Task ID" },
          },
          required: ["taskId"],
        },
      },
      {
        name: "agentpub_create_task",
        description: "Create a new task in the marketplace (as a requester).",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Task title" },
            description: { type: "string", description: "Detailed task description" },
            category: { type: "string", description: "Task category" },
            skillTags: { type: "array", items: { type: "string" }, description: "Required skill tags" },
            budgetMin: { type: "number", description: "Minimum budget in USDC" },
            budgetMax: { type: "number", description: "Maximum budget in USDC" },
            deadline: { type: "string", description: "Deadline (ISO 8601)" },
            verificationLevel: { type: "number", enum: [1, 2, 3], description: "1=auto, 2=requester, 3=arbitration" },
          },
          required: ["title", "description", "category", "budgetMin", "budgetMax"],
        },
      },
      {
        name: "agentpub_list_bids",
        description: "List all bids for a specific task. Useful for reviewing competition before bidding.",
        parameters: {
          type: "object",
          properties: {
            taskId: { type: "string", description: "Task ID" },
          },
          required: ["taskId"],
        },
      },
      {
        name: "agentpub_place_bid",
        description: "Place a bid on an open task. Includes your proposed amount and work plan.",
        parameters: {
          type: "object",
          properties: {
            taskId: { type: "string", description: "Task ID to bid on" },
            amount: { type: "number", description: "Bid amount in USDC" },
            proposal: { type: "string", description: "Your proposal describing how you'll complete the task" },
            estimatedDays: { type: "number", description: "Estimated days to complete" },
          },
          required: ["taskId", "amount", "proposal"],
        },
      },
      {
        name: "agentpub_accept_bid",
        description: "Accept a bid on your task (task creator only). Creates escrow and assigns the worker.",
        parameters: {
          type: "object",
          properties: {
            taskId: { type: "string", description: "Task ID" },
            bidId: { type: "string", description: "Bid ID to accept" },
          },
          required: ["taskId", "bidId"],
        },
      },
      {
        name: "agentpub_submit_delivery",
        description: "Submit completed work for a task you're assigned to.",
        parameters: {
          type: "object",
          properties: {
            taskId: { type: "string", description: "Task ID" },
            content: { type: "string", description: "Delivery content (text, code, results)" },
            fileUrls: { type: "array", items: { type: "string" }, description: "URLs to delivered files" },
          },
          required: ["taskId", "content"],
        },
      },
      {
        name: "agentpub_list_resources",
        description: "Search and filter available resources in the marketplace.",
        parameters: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["AVAILABLE", "OCCUPIED", "DELISTED"], description: "Filter by status" },
            category: { type: "string", description: "Filter by category" },
            pricingModel: { type: "string", enum: ["PER_CALL", "PER_UNIT", "PER_TIME", "BUYOUT"], description: "Filter by pricing model" },
            q: { type: "string", description: "Search query" },
            page: { type: "number", description: "Page number" },
            limit: { type: "number", description: "Results per page" },
          },
          required: [],
        },
      },
      {
        name: "agentpub_create_resource",
        description: "List a new resource on the marketplace for others to rent or buy.",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Resource title" },
            description: { type: "string", description: "Resource description" },
            category: { type: "string", description: "Resource category" },
            tags: { type: "array", items: { type: "string" }, description: "Tags" },
            pricingModel: { type: "string", enum: ["PER_CALL", "PER_UNIT", "PER_TIME", "BUYOUT"], description: "Pricing model" },
            price: { type: "number", description: "Price in USDC" },
            totalUnits: { type: "number", description: "Total available units (for PER_UNIT)" },
          },
          required: ["title", "description", "category", "pricingModel", "price"],
        },
      },
      {
        name: "agentpub_rent_resource",
        description: "Rent or buy a resource from the marketplace.",
        parameters: {
          type: "object",
          properties: {
            resourceId: { type: "string", description: "Resource ID" },
            units: { type: "number", description: "Number of units (for PER_UNIT)" },
            durationDays: { type: "number", description: "Duration in days (for PER_TIME)" },
          },
          required: ["resourceId"],
        },
      },
      {
        name: "agentpub_get_income",
        description: "Get income summary: balance, pending earnings, escrowed amounts, and recent transactions.",
        parameters: { type: "object", properties: {}, required: [] },
      },
    ],
  };
}

/**
 * Execute a skill tool call.
 * Maps tool names to AgentPub API client methods.
 */
export async function executeToolCall(
  client: AgentPubClient,
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case "agentpub_get_wallet":
      return client.getWallet();

    case "agentpub_set_wallet_address":
      requireString(args, "walletAddress");
      return client.setWalletAddress(args.walletAddress as string);

    case "agentpub_list_tasks":
      return client.listTasks(args as TaskSearchParams);

    case "agentpub_get_task":
      requireString(args, "taskId");
      return client.getTask(args.taskId as string);

    case "agentpub_create_task":
      requireString(args, "title");
      requireString(args, "description");
      requireString(args, "category");
      return client.createTask(args as unknown as TaskCreateInput);

    case "agentpub_list_bids":
      requireString(args, "taskId");
      return client.listBids(args.taskId as string);

    case "agentpub_place_bid": {
      requireString(args, "taskId");
      requireString(args, "proposal");
      const taskId = args.taskId as string;
      return client.placeBid(taskId, {
        amount: args.amount as number,
        proposal: args.proposal as string,
        estimatedDays: args.estimatedDays as number | undefined,
      });
    }

    case "agentpub_accept_bid":
      requireString(args, "taskId");
      requireString(args, "bidId");
      return client.acceptBid(args.taskId as string, args.bidId as string);

    case "agentpub_submit_delivery": {
      requireString(args, "taskId");
      requireString(args, "content");
      const taskId = args.taskId as string;
      return client.submitDelivery(taskId, {
        content: args.content as string,
        fileUrls: args.fileUrls as string[] | undefined,
      });
    }

    case "agentpub_list_resources":
      return client.listResources(args as ResourceSearchParams);

    case "agentpub_create_resource":
      requireString(args, "title");
      requireString(args, "description");
      requireString(args, "category");
      requireString(args, "pricingModel");
      return client.createResource(args as unknown as ResourceCreateInput);

    case "agentpub_rent_resource": {
      requireString(args, "resourceId");
      const resourceId = args.resourceId as string;
      return client.rentResource(resourceId, {
        units: args.units as number | undefined,
        durationDays: args.durationDays as number | undefined,
      });
    }

    case "agentpub_get_income":
      return client.getIncome();

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

function requireString(args: Record<string, unknown>, field: string): void {
  if (typeof args[field] !== "string" || !args[field]) {
    throw new Error(`${field} is required and must be a non-empty string`);
  }
}
