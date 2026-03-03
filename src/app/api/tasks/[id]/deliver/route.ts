import { NextRequest } from "next/server";
import { authenticateRequest, unauthorized, badRequest, notFound } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { l1AutoVerify, l2RequestConfirmation } from "@/lib/arbitration";
import { releaseEscrow } from "@/lib/escrow";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return unauthorized();

  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return notFound("Task not found");
  if (task.status !== "IN_PROGRESS") return badRequest("Task is not in progress");
  if (task.assigneeId !== authResult.userId) {
    return Response.json({ error: "Only the assigned worker can submit deliveries" }, { status: 403 });
  }

  const { content, fileUrls } = await req.json();
  if (!content) return badRequest("content is required");

  const delivery = await prisma.taskDelivery.create({
    data: {
      taskId: id,
      submitterId: authResult.userId,
      content,
      fileUrls: fileUrls || [],
    },
  });

  // L1 auto-verification if applicable
  if (task.verificationLevel === 1) {
    const result = await l1AutoVerify(id, delivery.id);
    if (result.passed) {
      // Auto-approve
      await prisma.taskDelivery.update({
        where: { id: delivery.id },
        data: { status: "ACCEPTED" },
      });
      await prisma.task.update({
        where: { id },
        data: { status: "COMPLETED" },
      });

      // Release escrow
      const escrow = await prisma.escrow.findUnique({ where: { taskId: id } });
      if (escrow) {
        await releaseEscrow(escrow.id, authResult.userId);
      }

      return Response.json({ delivery, verification: { auto: true, passed: true } }, { status: 201 });
    }
  }

  // L2: Move to pending verification (requester confirmation)
  await l2RequestConfirmation(id);

  return Response.json({ delivery, verification: { auto: false, pendingReview: true } }, { status: 201 });
}
