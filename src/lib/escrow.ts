import { prisma } from "./db";
import { updateReputation } from "./reputation";
import { isCdpEnabled, transferUSDC } from "./cdp";

const PLATFORM_FEE_RATE = 0.05; // 5%

/**
 * Create an escrow for a task. Locks funds from the payer.
 */
export async function createTaskEscrow(
  taskId: string,
  payerId: string,
  amount: number
) {
  const platformFee = amount * PLATFORM_FEE_RATE;
  return prisma.escrow.create({
    data: {
      taskId,
      payerId,
      amount,
      platformFee,
      status: "HELD",
    },
  });
}

/**
 * Release escrow to the payee (task completed successfully).
 */
export async function releaseEscrow(escrowId: string, payeeId: string) {
  const escrow = await prisma.escrow.findUnique({ where: { id: escrowId } });
  if (!escrow) throw new Error("Escrow not found");
  if (escrow.status !== "HELD") throw new Error("Escrow is not in HELD status");

  const netAmount = escrow.amount - escrow.platformFee;

  await prisma.$transaction(async (tx) => {
    await tx.escrow.update({
      where: { id: escrowId },
      data: { payeeId, status: "RELEASED" },
    });
    await tx.transaction.createMany({
      data: [
        { userId: payeeId, amount: netAmount, type: "ESCROW_RELEASE" },
        { userId: escrow.payerId, amount: -escrow.amount, type: "ESCROW_RELEASE" },
      ],
    });
  });

  // Attempt on-chain USDC transfer when CDP is enabled
  if (isCdpEnabled()) {
    try {
      const payee = await prisma.user.findUnique({
        where: { id: payeeId },
        select: { walletAddress: true },
      });
      if (payee?.walletAddress) {
        const result = await transferUSDC(payee.walletAddress, netAmount);
        if (result.txHash) {
          await prisma.escrow.update({
            where: { id: escrowId },
            data: { txHash: result.txHash },
          });
        }
      } else {
        console.warn(`[CDP] Payee ${payeeId} has no wallet address — skipping on-chain transfer`);
      }
    } catch (err) {
      console.error("[CDP] On-chain transfer failed, DB records already updated:", err);
    }
  }

  // Update reputations (non-critical, outside transaction)
  await Promise.all([
    updateReputation(payeeId),
    updateReputation(escrow.payerId),
  ]);

  return escrow;
}

/**
 * Refund escrow to the payer (task cancelled or dispute resolved).
 */
export async function refundEscrow(
  escrowId: string,
  refundPercent: number = 100
) {
  const escrow = await prisma.escrow.findUnique({ where: { id: escrowId } });
  if (!escrow) throw new Error("Escrow not found");
  if (escrow.status !== "HELD" && escrow.status !== "FROZEN") {
    throw new Error("Escrow cannot be refunded in current status");
  }

  const refundAmount = escrow.amount * (refundPercent / 100);

  await prisma.$transaction(async (tx) => {
    await tx.escrow.update({
      where: { id: escrowId },
      data: { status: "REFUNDED" },
    });
    await tx.transaction.create({
      data: { userId: escrow.payerId, amount: refundAmount, type: "ESCROW_REFUND" },
    });

    // If partial refund, pay the payee the remainder
    if (refundPercent < 100 && escrow.payeeId) {
      const payeeAmount = (escrow.amount - refundAmount) * (1 - PLATFORM_FEE_RATE);
      await tx.transaction.create({
        data: { userId: escrow.payeeId, amount: payeeAmount, type: "ESCROW_RELEASE" },
      });
    }
  });

  return escrow;
}

/**
 * Freeze escrow during a dispute.
 */
export async function freezeEscrow(escrowId: string) {
  const escrow = await prisma.escrow.findUnique({ where: { id: escrowId } });
  if (!escrow) throw new Error("Escrow not found");
  if (escrow.status !== "HELD") throw new Error("Only HELD escrows can be frozen");

  return prisma.escrow.update({
    where: { id: escrowId },
    data: { status: "FROZEN" },
  });
}
