import { NextRequest } from "next/server";
import { authenticateRequest, unauthorized, notFound, badRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { l3Arbitrate } from "@/lib/arbitration";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return unauthorized();

  const { id } = await params;

  // Only task creator or assignee can trigger arbitration
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return notFound("Task not found");
  if (task.creatorId !== authResult.userId && task.assigneeId !== authResult.userId) {
    return Response.json(
      { error: "Only the task creator or assignee can trigger arbitration" },
      { status: 403 }
    );
  }

  const dispute = await prisma.dispute.findUnique({ where: { taskId: id } });
  if (!dispute) return notFound("No dispute found for this task");
  if (dispute.status !== "OPEN") return badRequest("Dispute has already been resolved");

  // Mark as under review
  await prisma.dispute.update({
    where: { id: dispute.id },
    data: { status: "UNDER_REVIEW" },
  });

  const result = await l3Arbitrate(dispute.id);

  return Response.json({
    resolution: result.resolution,
    refundPercent: result.refundPercent,
    reasoning: result.reasoning,
  });
}
