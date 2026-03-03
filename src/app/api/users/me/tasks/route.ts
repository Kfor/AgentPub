import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

// ─── GET /api/users/me/tasks ────────────────────────────────
// List user's created tasks and assigned tasks

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role"); // "creator" or "assignee"
    const status = searchParams.get("status");

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
    );
    const skip = (page - 1) * limit;

    // Build where clause based on role filter
    const where: Record<string, unknown> = {};

    if (role === "creator") {
      where.creatorId = user.id;
    } else if (role === "assignee") {
      where.assigneeId = user.id;
    } else {
      // Both created and assigned tasks
      where.OR = [{ creatorId: user.id }, { assigneeId: user.id }];
    }

    if (status) {
      where.status = status;
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
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
          escrow: {
            select: {
              id: true,
              amount: true,
              status: true,
            },
          },
          _count: {
            select: {
              bids: true,
              deliveries: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.task.count({ where }),
    ]);

    return NextResponse.json({
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/users/me/tasks error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
