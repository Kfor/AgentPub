import { prisma } from "./db";
import { releaseEscrow, refundEscrow } from "./escrow";

export type ArbitrationResult = {
  resolution: "FULL_RELEASE" | "PARTIAL_REFUND" | "FULL_REFUND";
  refundPercent: number;
  reasoning: string;
};

/**
 * L1: Automatic verification for quantifiable tasks.
 * Returns true if the delivery passes automated checks.
 */
export async function l1AutoVerify(
  taskId: string,
  deliveryId: string
): Promise<{ passed: boolean; reason: string }> {
  const delivery = await prisma.taskDelivery.findUnique({
    where: { id: deliveryId },
    include: { task: true },
  });
  if (!delivery) return { passed: false, reason: "Delivery not found" };

  // Basic checks: content is non-empty, meets minimum length
  if (!delivery.content || delivery.content.trim().length < 10) {
    return { passed: false, reason: "Delivery content is too short or empty" };
  }

  // For code tasks, check if files were provided
  if (
    delivery.task.category === "code" &&
    delivery.fileUrls.length === 0 &&
    delivery.content.length < 50
  ) {
    return {
      passed: false,
      reason: "Code task requires substantial code or file attachments",
    };
  }

  return { passed: true, reason: "Automated checks passed" };
}

/**
 * L2: Requester confirmation. This just marks the task for requester review.
 * The actual confirmation happens via the API endpoint.
 */
export async function l2RequestConfirmation(taskId: string) {
  return prisma.task.update({
    where: { id: taskId },
    data: { status: "PENDING_VERIFICATION" },
  });
}

/**
 * L3: AI Arbitration for disputes.
 * In production, this would call an AI model. Here we implement rule-based logic.
 */
export async function l3Arbitrate(disputeId: string): Promise<ArbitrationResult> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      task: { include: { deliveries: true } },
      evidences: { include: { submitter: true } },
    },
  });

  if (!dispute) throw new Error("Dispute not found");

  const evidenceCount = dispute.evidences.length;
  const hasDelivery = dispute.task.deliveries.length > 0;
  const latestDelivery = dispute.task.deliveries[dispute.task.deliveries.length - 1];

  // Rule-based arbitration logic
  let resolution: ArbitrationResult["resolution"];
  let refundPercent: number;
  let reasoning: string;

  if (!hasDelivery) {
    resolution = "FULL_REFUND";
    refundPercent = 100;
    reasoning =
      "No delivery was submitted. Full refund to the requester.";
  } else if (latestDelivery && latestDelivery.content.length > 100 && evidenceCount <= 1) {
    resolution = "FULL_RELEASE";
    refundPercent = 0;
    reasoning =
      "Substantial delivery was provided with limited dispute evidence. Funds released to the worker.";
  } else {
    resolution = "PARTIAL_REFUND";
    refundPercent = 50;
    reasoning =
      "Both parties have legitimate claims. A 50/50 split is applied.";
  }

  // Update the dispute
  await prisma.dispute.update({
    where: { id: disputeId },
    data: {
      status: "RESOLVED",
      resolution,
      refundPercent,
      aiVerdict: reasoning,
    },
  });

  // Settle the escrow
  const escrow = await prisma.escrow.findUnique({
    where: { taskId: dispute.taskId },
  });

  if (escrow) {
    if (resolution === "FULL_RELEASE") {
      const assigneeId = dispute.task.assigneeId;
      if (assigneeId) {
        await releaseEscrow(escrow.id, assigneeId);
      }
    } else if (resolution === "FULL_REFUND") {
      await refundEscrow(escrow.id, 100);
    } else {
      await refundEscrow(escrow.id, refundPercent);
    }
  }

  // Mark the task as completed
  await prisma.task.update({
    where: { id: dispute.taskId },
    data: { status: "COMPLETED" },
  });

  return { resolution, refundPercent, reasoning };
}
