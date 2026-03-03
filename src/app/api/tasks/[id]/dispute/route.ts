import { NextRequest } from "next/server";
import { authenticateRequest, unauthorized, badRequest, notFound } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { freezeEscrow } from "@/lib/escrow";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return unauthorized();

  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return notFound("Task not found");

  // Only creator or assignee can initiate a dispute
  if (task.creatorId !== authResult.userId && task.assigneeId !== authResult.userId) {
    return Response.json({ error: "Only the task creator or assignee can initiate a dispute" }, { status: 403 });
  }

  if (task.status !== "PENDING_VERIFICATION" && task.status !== "IN_PROGRESS") {
    return badRequest("Disputes can only be raised for tasks in progress or pending verification");
  }

  const { reason } = await req.json();
  if (!reason) return badRequest("reason is required");

  // Check no existing dispute
  const existing = await prisma.dispute.findUnique({ where: { taskId: id } });
  if (existing) return badRequest("Dispute already exists for this task");

  const dispute = await prisma.dispute.create({
    data: {
      taskId: id,
      initiatorId: authResult.userId,
      reason,
    },
  });

  // Freeze escrow and mark task as disputed
  await prisma.task.update({
    where: { id },
    data: { status: "DISPUTED" },
  });

  const escrow = await prisma.escrow.findUnique({ where: { taskId: id } });
  if (escrow) await freezeEscrow(escrow.id);

  return Response.json(dispute, { status: 201 });
}
