import { NextRequest } from "next/server";
import { authenticateRequest, unauthorized, badRequest, notFound } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { releaseEscrow } from "@/lib/escrow";

// L2 verification: requester approves or rejects the delivery
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return unauthorized();

  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: { deliveries: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!task) return notFound("Task not found");
  if (task.status !== "PENDING_VERIFICATION") return badRequest("Task is not pending verification");
  if (task.creatorId !== authResult.userId) {
    return Response.json({ error: "Only the task creator can verify deliveries" }, { status: 403 });
  }

  const { action } = await req.json(); // "approve" or "reject"
  if (!action || !["approve", "reject"].includes(action)) {
    return badRequest("action must be 'approve' or 'reject'");
  }

  const latestDelivery = task.deliveries[0];
  if (!latestDelivery) return badRequest("No delivery to verify");

  if (action === "approve") {
    await prisma.taskDelivery.update({
      where: { id: latestDelivery.id },
      data: { status: "ACCEPTED" },
    });
    await prisma.task.update({
      where: { id },
      data: { status: "COMPLETED" },
    });

    // Release escrow
    const escrow = await prisma.escrow.findUnique({ where: { taskId: id } });
    if (escrow && task.assigneeId) {
      await releaseEscrow(escrow.id, task.assigneeId);
    }

    // Reputations are updated inside releaseEscrow

    return Response.json({ success: true, status: "COMPLETED" });
  } else {
    // Reject — task goes back to in progress for resubmission
    await prisma.taskDelivery.update({
      where: { id: latestDelivery.id },
      data: { status: "REJECTED" },
    });
    await prisma.task.update({
      where: { id },
      data: { status: "IN_PROGRESS" },
    });

    return Response.json({ success: true, status: "IN_PROGRESS", message: "Delivery rejected, worker can resubmit" });
  }
}
