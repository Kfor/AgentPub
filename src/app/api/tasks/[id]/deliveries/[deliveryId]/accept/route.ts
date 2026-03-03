import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { releaseEscrow } from "@/lib/escrow";

type RouteContext = { params: Promise<{ id: string; deliveryId: string }> };

// ─── POST /api/tasks/[id]/deliveries/[deliveryId]/accept ───
// Accept delivery (only task creator). Set delivery ACCEPTED, task COMPLETED.
// Release escrow. Update reputation.

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, deliveryId } = await context.params;

    // Verify task
    const task = await prisma.task.findUnique({
      where: { id },
      include: { escrow: true },
    });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.creatorId !== user.id) {
      return NextResponse.json(
        { error: "Only the task creator can accept deliveries" },
        { status: 403 }
      );
    }

    if (task.status !== "PENDING_VERIFICATION") {
      return NextResponse.json(
        { error: "Task is not pending verification" },
        { status: 400 }
      );
    }

    // Verify delivery
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
    });
    if (!delivery) {
      return NextResponse.json(
        { error: "Delivery not found" },
        { status: 404 }
      );
    }

    if (delivery.taskId !== id) {
      return NextResponse.json(
        { error: "Delivery does not belong to this task" },
        { status: 400 }
      );
    }

    if (delivery.status !== "SUBMITTED") {
      return NextResponse.json(
        { error: "Delivery is not in SUBMITTED status" },
        { status: 400 }
      );
    }

    // Perform updates in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Accept delivery
      const acceptedDelivery = await tx.delivery.update({
        where: { id: deliveryId },
        data: { status: "ACCEPTED" },
      });

      // Complete task
      const completedTask = await tx.task.update({
        where: { id },
        data: { status: "COMPLETED" },
      });

      // Update assignee reputation
      if (task.assigneeId) {
        await tx.reputation.upsert({
          where: { userId: task.assigneeId },
          update: {
            tasksCompleted: { increment: 1 },
            totalEarnings: { increment: task.escrow?.amount || task.budget },
          },
          create: {
            userId: task.assigneeId,
            tasksCompleted: 1,
            totalEarnings: task.escrow?.amount || task.budget,
          },
        });
      }

      // Update creator reputation (spending)
      await tx.reputation.upsert({
        where: { userId: user.id },
        update: {
          totalSpending: { increment: task.escrow?.amount || task.budget },
        },
        create: {
          userId: user.id,
          totalSpending: task.escrow?.amount || task.budget,
        },
      });

      return { acceptedDelivery, completedTask };
    });

    // Release escrow
    let escrowResult = null;
    if (task.escrow) {
      escrowResult = await releaseEscrow(task.escrow.id);
    }

    // Notify the assignee
    if (task.assigneeId) {
      await prisma.notification.create({
        data: {
          type: "DELIVERY_ACCEPTED",
          title: "Delivery accepted!",
          message: `Your delivery for "${task.title}" has been accepted. Payment has been released.`,
          userId: task.assigneeId,
          metadata: {
            taskId: id,
            deliveryId,
            escrowId: task.escrow?.id,
          },
        },
      });
    }

    return NextResponse.json({
      delivery: result.acceptedDelivery,
      task: result.completedTask,
      escrow: escrowResult,
    });
  } catch (error) {
    console.error(
      "POST /api/tasks/[id]/deliveries/[deliveryId]/accept error:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
