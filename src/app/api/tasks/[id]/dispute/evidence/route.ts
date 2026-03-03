import { NextRequest } from "next/server";
import { authenticateRequest, unauthorized, badRequest, notFound } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return unauthorized();

  const { id } = await params;

  // Only task creator or assignee can submit evidence
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return notFound("Task not found");
  if (task.creatorId !== authResult.userId && task.assigneeId !== authResult.userId) {
    return Response.json(
      { error: "Only dispute parties can submit evidence" },
      { status: 403 }
    );
  }

  const dispute = await prisma.dispute.findUnique({ where: { taskId: id } });
  if (!dispute) return notFound("No dispute found for this task");
  if (dispute.status !== "OPEN") return badRequest("Dispute is no longer accepting evidence");

  const { content, fileUrls } = await req.json();
  if (!content) return badRequest("content is required");

  const evidence = await prisma.disputeEvidence.create({
    data: {
      disputeId: dispute.id,
      submitterId: authResult.userId,
      content,
      fileUrls: fileUrls || [],
    },
  });

  return Response.json(evidence, { status: 201 });
}
