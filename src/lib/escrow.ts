import prisma from "@/lib/db";
import type { Escrow, PrismaClient } from "@prisma/client";

// Prisma transaction client type
type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

/** Platform fee rate: 5% of escrow amount */
export const PLATFORM_FEE_RATE = 0.05;

/**
 * Create an escrow record for a task.
 *
 * Calculates a 5% platform fee on the escrowed amount. The escrow is created
 * with HELD status, meaning funds are locked until the task is completed,
 * disputed, or cancelled.
 *
 * @param taskId - The task this escrow is associated with
 * @param payerId - The user funding the escrow (task creator)
 * @param amount - The total amount to escrow in USDC
 * @param payeeId - Optional: the user who will receive funds on release
 * @param tx - Optional: Prisma transaction client for atomic operations
 * @returns The created Escrow record
 */
export async function createEscrow(
  taskId: string,
  payerId: string,
  amount: number,
  payeeId?: string,
  tx?: TxClient
): Promise<Escrow> {
  const db = tx ?? prisma;
  const platformFee = parseFloat((amount * PLATFORM_FEE_RATE).toFixed(6));

  const escrow = await db.escrow.create({
    data: {
      amount,
      platformFee,
      currency: "USDC",
      status: "HELD",
      taskId,
      payerId,
      payeeId: payeeId ?? null,
    },
  });

  return escrow;
}

/**
 * Release escrow funds to the payee.
 *
 * This should be called when a task delivery is accepted by the creator.
 * The escrow status changes from HELD to RELEASED.
 *
 * @param escrowId - The escrow record to release
 * @returns The updated Escrow record
 * @throws If the escrow is not in HELD status
 */
export async function releaseEscrow(escrowId: string): Promise<Escrow> {
  const existing = await prisma.escrow.findUniqueOrThrow({
    where: { id: escrowId },
  });

  if (existing.status !== "HELD") {
    throw new Error(
      `Cannot release escrow in "${existing.status}" status. Only HELD escrows can be released.`
    );
  }

  const escrow = await prisma.escrow.update({
    where: { id: escrowId },
    data: {
      status: "RELEASED",
      releaseHash: `release_${Date.now()}_${escrowId}`,
    },
  });

  return escrow;
}

/**
 * Refund escrow funds to the payer.
 *
 * This should be called when a task is cancelled or a dispute is resolved
 * in favor of the payer.
 *
 * @param escrowId - The escrow record to refund
 * @returns The updated Escrow record
 * @throws If the escrow is not in HELD or FROZEN status
 */
export async function refundEscrow(escrowId: string): Promise<Escrow> {
  const existing = await prisma.escrow.findUniqueOrThrow({
    where: { id: escrowId },
  });

  if (existing.status !== "HELD" && existing.status !== "FROZEN") {
    throw new Error(
      `Cannot refund escrow in "${existing.status}" status. Only HELD or FROZEN escrows can be refunded.`
    );
  }

  const escrow = await prisma.escrow.update({
    where: { id: escrowId },
    data: {
      status: "REFUNDED",
      releaseHash: `refund_${Date.now()}_${escrowId}`,
    },
  });

  return escrow;
}

/**
 * Freeze escrow funds during a dispute.
 *
 * Prevents both release and refund until the dispute is resolved.
 *
 * @param escrowId - The escrow record to freeze
 * @returns The updated Escrow record
 * @throws If the escrow is not in HELD status
 */
export async function freezeEscrow(escrowId: string): Promise<Escrow> {
  const existing = await prisma.escrow.findUniqueOrThrow({
    where: { id: escrowId },
  });

  if (existing.status !== "HELD") {
    throw new Error(
      `Cannot freeze escrow in "${existing.status}" status. Only HELD escrows can be frozen.`
    );
  }

  const escrow = await prisma.escrow.update({
    where: { id: escrowId },
    data: {
      status: "FROZEN",
    },
  });

  return escrow;
}

/**
 * Get the current status of an escrow by task ID.
 */
export async function getEscrowByTaskId(
  taskId: string
): Promise<Escrow | null> {
  return prisma.escrow.findUnique({
    where: { taskId },
  });
}
