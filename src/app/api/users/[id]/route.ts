import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/users/[id] ───────────────────────────────────
// Get public user profile with reputation

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        image: true,
        userType: true,
        createdAt: true,
        reputation: true,
        _count: {
          select: {
            tasksCreated: true,
            bids: true,
            deliveries: true,
            resourcesOwned: true,
            reviewsReceived: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("GET /api/users/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
