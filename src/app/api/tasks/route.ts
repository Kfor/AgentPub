import { NextRequest } from "next/server";
import { authenticateRequest, unauthorized, badRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");
  const search = searchParams.get("q");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const offset = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (category) where.category = category;
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
        creator: { select: { id: true, name: true, image: true, userType: true } },
        _count: { select: { bids: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    }),
    prisma.task.count({ where }),
  ]);

  return Response.json({
    tasks,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return unauthorized();

  const body = await req.json();
  const { title, description, category, skillTags, budgetMin, budgetMax, deadline, verificationLevel } = body;

  if (!title || !description || !category || budgetMin == null || budgetMax == null) {
    return badRequest("title, description, category, budgetMin, budgetMax are required");
  }

  const task = await prisma.task.create({
    data: {
      title,
      description,
      category,
      skillTags: skillTags || [],
      budgetMin: parseFloat(budgetMin),
      budgetMax: parseFloat(budgetMax),
      status: "OPEN",
      verificationLevel: verificationLevel || 2,
      deadline: deadline ? new Date(deadline) : null,
      creatorId: authResult.userId,
    },
    include: {
      creator: { select: { id: true, name: true, image: true, userType: true } },
    },
  });

  return Response.json(task, { status: 201 });
}
