import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { createEscrow } from "@/lib/escrow";

type RouteContext = { params: Promise<{ id: string; bidId: string }> };

// ─── POST /api/tasks/[id]/bids/[bidId]/accept ──────────────
// Accept bid: only task creator. Set bid ACCEPTED, others REJECTED.
// Set task IN_PROGRESS, assigneeId. Create escrow (5% platform fee).

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, bidId } = await context.params;

    // Verify task exists and belongs to user
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.creatorId !== user.id) {
      return NextResponse.json(
        { error: "Only the task creator can accept bids" },
        { status: 403 }
      );
    }

    if (task.status !== "OPEN") {
      return NextResponse.json(
        { error: "Task is not in OPEN status" },
        { status: 400 }
      );
    }

    // Verify bid exists and belongs to this task
    const bid = await prisma.bid.findUnique({ where: { id: bidId } });
    if (!bid) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 });
    }

    if (bid.taskId !== id) {
      return NextResponse.json(
        { error: "Bid does not belong to this task" },
        { status: 400 }
      );
    }

    if (bid.status !== "PENDING") {
      return NextResponse.json(
        { error: "Bid is not in PENDING status" },
        { status: 400 }
      );
    }

    // Use a transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Accept this bid
      const acceptedBid = await tx.bid.update({
        where: { id: bidId },
        data: { status: "ACCEPTED" },
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

      // Reject all other pending bids for this task
      await tx.bid.updateMany({
        where: {
          taskId: id,
          id: { not: bidId },
          status: "PENDING",
        },
        data: { status: "REJECTED" },
      });

      // Update task: set IN_PROGRESS and assign the bidder
      const updatedTask = await tx.task.update({
        where: { id },
        data: {
          status: "IN_PROGRESS",
          assigneeId: bid.bidderId,
        },
      });

      // Create escrow inside the transaction for atomicity
      const escrow = await createEscrow(id, user.id, bid.amount, bid.bidderId, tx);

      return { acceptedBid, updatedTask, escrow };
    });

    const escrow = result.escrow;

    // Notify the winning bidder
    await prisma.notification.create({
      data: {
        type: "BID_ACCEPTED",
        title: "Your bid was accepted!",
        message: `Your bid of ${bid.amount} USDC on "${task.title}" has been accepted. You can now start working.`,
        userId: bid.bidderId,
        metadata: { taskId: id, bidId, escrowId: escrow.id },
      },
    });

    // Notify rejected bidders
    const rejectedBids = await prisma.bid.findMany({
      where: { taskId: id, status: "REJECTED" },
      select: { bidderId: true },
    });

    if (rejectedBids.length > 0) {
      await prisma.notification.createMany({
        data: rejectedBids
          .filter((b) => b.bidderId !== bid.bidderId)
          .map((b) => ({
            type: "BID_REJECTED",
            title: "Bid not selected",
            message: `Another bid was selected for the task "${task.title}".`,
            userId: b.bidderId,
            metadata: { taskId: id },
          })),
      });
    }

    return NextResponse.json({
      bid: result.acceptedBid,
      task: result.updatedTask,
      escrow,
    });
  } catch (error) {
    console.error("POST /api/tasks/[id]/bids/[bidId]/accept error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
