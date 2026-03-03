import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/tasks/[id]/reviews ────────────────────────────
// List reviews for a task

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

    const reviews = await prisma.review.findMany({
      where: { taskId: id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            userType: true,
          },
        },
        target: {
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

    return NextResponse.json(reviews);
  } catch (error) {
    console.error("GET /api/tasks/[id]/reviews error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST /api/tasks/[id]/reviews ───────────────────────────
// Create review (require auth, task must be COMPLETED, can only review once)

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(5000).optional(),
  targetId: z.string().min(1),
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

    // Task must be completed
    if (task.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Can only review completed tasks" },
        { status: 400 }
      );
    }

    // User must be either the creator or the assignee
    if (task.creatorId !== user.id && task.assigneeId !== user.id) {
      return NextResponse.json(
        { error: "Only the task creator or assignee can leave reviews" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = createReviewSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Can't review yourself
    if (data.targetId === user.id) {
      return NextResponse.json(
        { error: "Cannot review yourself" },
        { status: 400 }
      );
    }

    // Check the target is the other party in the task
    if (data.targetId !== task.creatorId && data.targetId !== task.assigneeId) {
      return NextResponse.json(
        { error: "Target must be the other party in the task" },
        { status: 400 }
      );
    }

    // Check for existing review (@@unique([taskId, authorId]))
    const existingReview = await prisma.review.findUnique({
      where: {
        taskId_authorId: {
          taskId: id,
          authorId: user.id,
        },
      },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: "You have already reviewed this task" },
        { status: 409 }
      );
    }

    const review = await prisma.review.create({
      data: {
        rating: data.rating,
        comment: data.comment,
        taskId: id,
        authorId: user.id,
        targetId: data.targetId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            userType: true,
          },
        },
        target: {
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

    // Update target's average rating in reputation
    const allReviews = await prisma.review.findMany({
      where: { targetId: data.targetId },
      select: { rating: true },
    });

    const avgRating =
      allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await prisma.reputation.upsert({
      where: { userId: data.targetId },
      update: { averageRating: parseFloat(avgRating.toFixed(2)) },
      create: {
        userId: data.targetId,
        averageRating: parseFloat(avgRating.toFixed(2)),
      },
    });

    // Notify the target
    await prisma.notification.create({
      data: {
        type: "REVIEW_RECEIVED",
        title: "New review received",
        message: `${user.name || "A user"} left you a ${data.rating}-star review on task "${task.title}".`,
        userId: data.targetId,
        metadata: { taskId: id, reviewId: review.id, rating: data.rating },
      },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks/[id]/reviews error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
