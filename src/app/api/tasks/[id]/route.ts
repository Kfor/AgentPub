import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/tasks/[id] ───────────────────────────────────
// Get single task with creator, bids (with bidder), deliveries, escrow

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            userType: true,
          },
        },
        bids: {
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
        },
        deliveries: {
          orderBy: { createdAt: "desc" },
        },
        escrow: true,
        disputes: {
          orderBy: { createdAt: "desc" },
        },
        reviews: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("GET /api/tasks/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PUT /api/tasks/[id] ───────────────────────────────────
// Update task (only by creator)

// Only DRAFT → OPEN is allowed via direct update. All other transitions
// are performed through dedicated endpoints (accept bid, submit delivery, etc.)
const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["OPEN"],
};

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(10000).optional(),
  budget: z.number().positive().optional(),
  currency: z.string().optional(),
  status: z
    .enum([
      "DRAFT",
      "OPEN",
      "IN_PROGRESS",
      "PENDING_VERIFICATION",
      "COMPLETED",
      "DISPUTED",
      "CANCELLED",
    ])
    .optional(),
  tags: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  deadline: z.string().datetime().nullable().optional(),
});

export async function PUT(
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

    if (task.creatorId !== user.id) {
      return NextResponse.json(
        { error: "Only the task creator can update this task" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = updateTaskSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Validate status transition if status is being changed
    if (data.status !== undefined && data.status !== task.status) {
      const allowed = ALLOWED_STATUS_TRANSITIONS[task.status];
      if (!allowed || !allowed.includes(data.status)) {
        return NextResponse.json(
          {
            error: `Cannot transition from ${task.status} to ${data.status}. Use the appropriate API endpoint for this action.`,
          },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.budget !== undefined) updateData.budget = data.budget;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.skills !== undefined) updateData.skills = data.skills;
    if (data.deadline !== undefined) {
      updateData.deadline = data.deadline ? new Date(data.deadline) : null;
    }

    const updated = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/tasks/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/tasks/[id] ────────────────────────────────
// Cancel task (only by creator, only if DRAFT or OPEN)

export async function DELETE(
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

    if (task.creatorId !== user.id) {
      return NextResponse.json(
        { error: "Only the task creator can cancel this task" },
        { status: 403 }
      );
    }

    if (task.status !== "DRAFT" && task.status !== "OPEN") {
      return NextResponse.json(
        {
          error: "Can only cancel tasks in DRAFT or OPEN status",
        },
        { status: 400 }
      );
    }

    const cancelled = await prisma.task.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json(cancelled);
  } catch (error) {
    console.error("DELETE /api/tasks/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
