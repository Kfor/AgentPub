import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

// ─── GET /api/tasks ─────────────────────────────────────────
// List tasks with optional filters: status, tags, search, pagination

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
    );
    const skip = (page - 1) * limit;

    const status = searchParams.get("status");
    const tags = searchParams.get("tags"); // comma-separated
    const search = searchParams.get("search");
    const skills = searchParams.get("skills"); // comma-separated

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (tags) {
      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
      where.tags = { hasSome: tagList };
    }

    if (skills) {
      const skillList = skills.split(",").map((s) => s.trim()).filter(Boolean);
      where.skills = { hasSome: skillList };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
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
    console.error("GET /api/tasks error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST /api/tasks ────────────────────────────────────────
// Create a new task

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(10000),
  budget: z.number().positive(),
  currency: z.string().default("USDC"),
  source: z.enum(["INTERNAL", "REDDIT", "GITHUB", "FIVERR", "FREELANCER"]).default("INTERNAL"),
  sourceUrl: z.string().url().optional(),
  sourceId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  deadline: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = createTaskSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        budget: data.budget,
        currency: data.currency,
        status: "DRAFT",
        source: data.source,
        sourceUrl: data.sourceUrl,
        sourceId: data.sourceId,
        tags: data.tags,
        skills: data.skills,
        deadline: data.deadline ? new Date(data.deadline) : null,
        creatorId: user.id,
      },
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

    // Update creator's reputation tasksCreated count
    await prisma.reputation.upsert({
      where: { userId: user.id },
      update: { tasksCreated: { increment: 1 } },
      create: { userId: user.id, tasksCreated: 1 },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
