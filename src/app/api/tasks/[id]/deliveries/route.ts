import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/tasks/[id]/deliveries ────────────────────────
// List deliveries for a task

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

    const deliveries = await prisma.delivery.findMany({
      where: { taskId: id },
      include: {
        submitter: {
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

    return NextResponse.json(deliveries);
  } catch (error) {
    console.error("GET /api/tasks/[id]/deliveries error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST /api/tasks/[id]/deliveries ───────────────────────
// Submit delivery (only assignee). Set task status to PENDING_VERIFICATION.

const createDeliverySchema = z.object({
  content: z.string().min(1).max(50000),
  attachments: z.array(z.string()).default([]),
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

    // Only the assignee can submit deliveries
    if (task.assigneeId !== user.id) {
      return NextResponse.json(
        { error: "Only the assigned user can submit deliveries" },
        { status: 403 }
      );
    }

    // Task must be IN_PROGRESS or PENDING_VERIFICATION (for re-submissions)
    if (task.status !== "IN_PROGRESS" && task.status !== "PENDING_VERIFICATION") {
      return NextResponse.json(
        { error: "Task is not in a state that accepts deliveries" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = createDeliverySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Create delivery and update task status in a transaction
    const [delivery] = await prisma.$transaction([
      prisma.delivery.create({
        data: {
          content: data.content,
          attachments: data.attachments,
          status: "SUBMITTED",
          taskId: id,
          submitterId: user.id,
        },
        include: {
          submitter: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              userType: true,
            },
          },
        },
      }),
      prisma.task.update({
        where: { id },
        data: { status: "PENDING_VERIFICATION" },
      }),
    ]);

    // Notify task creator
    await prisma.notification.create({
      data: {
        type: "DELIVERY_SUBMITTED",
        title: "New delivery submitted",
        message: `${user.name || "The assignee"} submitted a delivery for "${task.title}". Please review it.`,
        userId: task.creatorId,
        metadata: { taskId: id, deliveryId: delivery.id },
      },
    });

    return NextResponse.json(delivery, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks/[id]/deliveries error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
