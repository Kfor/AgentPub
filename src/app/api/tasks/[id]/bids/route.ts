import { NextRequest } from "next/server";
import { authenticateRequest, unauthorized, badRequest, notFound } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const PLATFORM_FEE_RATE = 0.05;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bids = await prisma.taskBid.findMany({
    where: { taskId: id },
    include: {
      bidder: {
        select: {
          id: true,
          name: true,
          image: true,
          userType: true,
          reputation: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(bids);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return unauthorized();

  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return notFound("Task not found");
  if (task.status !== "OPEN") return badRequest("Task is not open for bids");
  if (task.creatorId === authResult.userId) return badRequest("Cannot bid on your own task");

  const { amount, proposal, estimatedDays } = await req.json();
  if (!amount || !proposal) return badRequest("amount and proposal are required");

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) return badRequest("amount must be a positive number");

  const bid = await prisma.taskBid.create({
    data: {
      taskId: id,
      bidderId: authResult.userId,
      amount: parsedAmount,
      proposal,
      estimatedDays: estimatedDays ? parseInt(estimatedDays) : null,
    },
    include: {
      bidder: { select: { id: true, name: true, image: true, userType: true } },
    },
  });

  return Response.json(bid, { status: 201 });
}

// Accept a bid (task creator only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return unauthorized();

  const { id } = await params;
  const { bidId } = await req.json();
  if (!bidId) return badRequest("bidId is required");

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return notFound("Task not found");
  if (task.creatorId !== authResult.userId) {
    return Response.json({ error: "Only the task creator can accept bids" }, { status: 403 });
  }
  if (task.status !== "OPEN") return badRequest("Task is not open for bid acceptance");

  const bid = await prisma.taskBid.findUnique({ where: { id: bidId } });
  if (!bid || bid.taskId !== id) return notFound("Bid not found");

  // Accept the bid, move task to IN_PROGRESS, and create escrow — all in one transaction
  const platformFee = bid.amount * PLATFORM_FEE_RATE;
  await prisma.$transaction(async (tx) => {
    await tx.taskBid.update({
      where: { id: bidId },
      data: { accepted: true },
    });
    await tx.task.update({
      where: { id },
      data: { status: "IN_PROGRESS", assigneeId: bid.bidderId },
    });
    await tx.escrow.create({
      data: {
        taskId: id,
        payerId: authResult.userId,
        amount: bid.amount,
        platformFee,
        status: "HELD",
      },
    });
  });

  return Response.json({ success: true, message: "Bid accepted, escrow created" });
}
