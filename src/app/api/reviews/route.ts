import { NextRequest } from "next/server";
import { authenticateRequest, unauthorized, badRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { updateReputation } from "@/lib/reputation";

export async function POST(req: NextRequest) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return unauthorized();

  const { targetId, taskId, rating, comment } = await req.json();
  if (!targetId || !taskId || !rating) return badRequest("targetId, taskId, and rating are required");
  if (rating < 1 || rating > 5) return badRequest("Rating must be between 1 and 5");
  if (targetId === authResult.userId) return badRequest("Cannot review yourself");

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return badRequest("Task not found");
  if (task.creatorId !== authResult.userId && task.assigneeId !== authResult.userId) {
    return badRequest("You can only review participants of tasks you're involved in");
  }
  if (task.status !== "COMPLETED") return badRequest("Task must be completed before reviewing");

  const review = await prisma.review.create({
    data: {
      authorId: authResult.userId,
      targetId,
      taskId,
      rating,
      comment: comment || null,
    },
  });

  // Update target's reputation
  await updateReputation(targetId);

  return Response.json(review, { status: 201 });
}
