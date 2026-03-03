import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/tasks/[id]/bids ──────────────────────────────
// List bids for a task

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const bids = await prisma.bid.findMany({
      where: { taskId: id },
      include: {
        bidder: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            userType: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(bids);
  } catch (error) {
    console.error("GET /api/tasks/[id]/bids error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST /api/tasks/[id]/bids ─────────────────────────────
// Create bid (require auth, can't bid on own task, can't bid twice)

const createBidSchema = z.object({
  amount: z.number().positive(),
  proposal: z.string().min(1).max(10000),
  estimatedDays: z.number().int().positive().optional(),
});

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Can't bid on own task
    if (task.creatorId === user.id) {
      return NextResponse.json(
        { error: "Cannot bid on your own task" },
        { status: 400 }
      );
    }

    // Task must be OPEN to accept bids
    if (task.status !== "OPEN") {
      return NextResponse.json(
        { error: "Task is not open for bids" },
        { status: 400 }
      );
    }

    // Check if user already bid on this task
    const existingBid = await prisma.bid.findUnique({
      where: {
        taskId_bidderId: {
          taskId: id,
          bidderId: user.id,
        },
      },
    });

    if (existingBid) {
      return NextResponse.json(
        { error: "You have already placed a bid on this task" },
        { status: 409 }
      );
    }

    const body = await request.json();
    const validation = createBidSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    const bid = await prisma.bid.create({
      data: {
        amount: data.amount,
        proposal: data.proposal,
        estimatedDays: data.estimatedDays,
        status: "PENDING",
        taskId: id,
        bidderId: user.id,
      },
      include: {
        bidder: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            userType: true,
          },
        },
      },
    });

    // Notify task creator about the new bid
    await prisma.notification.create({
      data: {
        type: "NEW_BID",
        title: "New bid received",
        message: `${user.name || "A user"} placed a bid of ${data.amount} USDC on your task "${task.title}"`,
        userId: task.creatorId,
        metadata: { taskId: id, bidId: bid.id },
      },
    });

    return NextResponse.json(bid, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks/[id]/bids error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
