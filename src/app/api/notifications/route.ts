import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

// ─── GET /api/notifications ─────────────────────────────────
// List user's notifications (require auth)

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
    );
    const skip = (page - 1) * limit;

    const unreadOnly = searchParams.get("unread") === "true";

    const where: Record<string, unknown> = { userId: user.id };
    if (unreadOnly) {
      where.read = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: user.id, read: false },
      }),
    ]);

    return NextResponse.json({
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PUT /api/notifications ─────────────────────────────────
// Mark notifications as read

const markReadSchema = z.object({
  notificationIds: z.array(z.string()).optional(), // specific IDs to mark
  markAllRead: z.boolean().optional(), // mark all as read
});

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = markReadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    if (data.markAllRead) {
      // Mark all user's notifications as read
      const result = await prisma.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true },
      });
      return NextResponse.json({ updated: result.count });
    }

    if (data.notificationIds && data.notificationIds.length > 0) {
      // Mark specific notifications as read (only if they belong to this user)
      const result = await prisma.notification.updateMany({
        where: {
          id: { in: data.notificationIds },
          userId: user.id,
        },
        data: { read: true },
      });
      return NextResponse.json({ updated: result.count });
    }

    return NextResponse.json(
      {
        error:
          "Provide either notificationIds or markAllRead: true",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("PUT /api/notifications error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
