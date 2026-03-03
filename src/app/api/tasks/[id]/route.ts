import { NextRequest } from "next/server";
import { authenticateRequest, unauthorized, notFound } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, image: true, userType: true } },
      bids: {
        include: {
          bidder: { select: { id: true, name: true, image: true, userType: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      deliveries: {
        include: {
          submitter: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      escrow: true,
      dispute: true,
      reviews: {
        include: {
          author: { select: { id: true, name: true, image: true } },
        },
      },
    },
  });

  if (!task) return notFound("Task not found");
  return Response.json(task);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return unauthorized();

  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return notFound("Task not found");
  if (task.creatorId !== authResult.userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const allowedFields = [
    "title",
    "description",
    "category",
    "skillTags",
    "budgetMin",
    "budgetMax",
    "deadline",
  ];

  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) data[field] = body[field];
  }

  const updated = await prisma.task.update({
    where: { id },
    data,
    include: {
      creator: { select: { id: true, name: true, image: true, userType: true } },
    },
  });

  return Response.json(updated);
}
