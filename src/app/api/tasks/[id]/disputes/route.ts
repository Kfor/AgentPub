import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { freezeEscrow } from "@/lib/escrow";

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/tasks/[id]/disputes ──────────────────────────
// List disputes for a task

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

    const disputes = await prisma.dispute.findMany({
      where: { taskId: id },
      include: {
        raisedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            userType: true,
          },
        },
        evidence: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(disputes);
  } catch (error) {
    console.error("GET /api/tasks/[id]/disputes error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST /api/tasks/[id]/disputes ─────────────────────────
// Create dispute (require auth, task must be PENDING_VERIFICATION or IN_PROGRESS)
// Set task status DISPUTED, freeze escrow.

const createDisputeSchema = z.object({
  reason: z.string().min(1).max(5000),
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

    const task = await prisma.task.findUnique({
      where: { id },
      include: { escrow: true },
    });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Task must be IN_PROGRESS or PENDING_VERIFICATION
    if (
      task.status !== "IN_PROGRESS" &&
      task.status !== "PENDING_VERIFICATION"
    ) {
      return NextResponse.json(
        {
          error:
            "Can only raise disputes on tasks that are IN_PROGRESS or PENDING_VERIFICATION",
        },
        { status: 400 }
      );
    }

    // User must be either the creator or assignee of the task
    if (task.creatorId !== user.id && task.assigneeId !== user.id) {
      return NextResponse.json(
        { error: "Only the task creator or assignee can raise a dispute" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = createDisputeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Create dispute and update task in a transaction
    const dispute = await prisma.$transaction(async (tx) => {
      const newDispute = await tx.dispute.create({
        data: {
          reason: data.reason,
          status: "OPEN",
          taskId: id,
          raisedById: user.id,
        },
        include: {
          raisedBy: {
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

      // Set task status to DISPUTED
      await tx.task.update({
        where: { id },
        data: { status: "DISPUTED" },
      });

      return newDispute;
    });

    // Freeze escrow if it exists
    if (task.escrow && task.escrow.status === "HELD") {
      await freezeEscrow(task.escrow.id);
    }

    // Notify the other party
    const notifyUserId =
      task.creatorId === user.id ? task.assigneeId : task.creatorId;

    if (notifyUserId) {
      await prisma.notification.create({
        data: {
          type: "DISPUTE_RAISED",
          title: "Dispute raised",
          message: `A dispute has been raised on task "${task.title}".`,
          userId: notifyUserId,
          metadata: { taskId: id, disputeId: dispute.id },
        },
      });
    }

    return NextResponse.json(dispute, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks/[id]/disputes error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
