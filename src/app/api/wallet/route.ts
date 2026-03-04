import { NextRequest } from "next/server";
import { authenticateRequest, unauthorized } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { isCdpEnabled, getAddressBalance } from "@/lib/cdp";

export async function GET(req: NextRequest) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: authResult.userId },
    select: { walletAddress: true },
  });

  const transactions = await prisma.transaction.findMany({
    where: { userId: authResult.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Calculate balance from transactions (DB-only fallback)
  const dbBalance = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  // When CDP is enabled, try to fetch on-chain USDC balance for the user's address
  let onChainBalance: number | null = null;
  if (isCdpEnabled() && user?.walletAddress) {
    try {
      onChainBalance = await getAddressBalance(user.walletAddress);
    } catch (err) {
      console.warn("[CDP] Failed to fetch on-chain balance, using DB balance:", err);
    }
  }

  // Count active escrows
  const heldEscrows = await prisma.escrow.findMany({
    where: {
      payerId: authResult.userId,
      status: "HELD",
    },
  });
  const escrowedAmount = heldEscrows.reduce((sum, e) => sum + e.amount, 0);

  // Pending earnings (escrows where user is payee and status is HELD)
  const pendingEarnings = await prisma.escrow.findMany({
    where: {
      payeeId: authResult.userId,
      status: "HELD",
    },
  });
  const pendingAmount = pendingEarnings.reduce(
    (sum, e) => sum + e.amount - e.platformFee,
    0
  );

  return Response.json({
    walletAddress: user?.walletAddress || null,
    balance: onChainBalance ?? dbBalance,
    onChainBalance,
    escrowedAmount,
    pendingEarnings: pendingAmount,
    recentTransactions: transactions,
  });
}

// Update wallet address
export async function PATCH(req: NextRequest) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return unauthorized();

  const { walletAddress } = await req.json();

  await prisma.user.update({
    where: { id: authResult.userId },
    data: { walletAddress },
  });

  return Response.json({ success: true, walletAddress });
}
