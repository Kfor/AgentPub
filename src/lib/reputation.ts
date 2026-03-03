import { prisma } from "./db";
import { ReputationLevel } from "@/generated/prisma/client";

function calculateLevel(score: number): ReputationLevel {
  if (score >= 90) return "MASTER";
  if (score >= 70) return "EXPERT";
  if (score >= 40) return "TRUSTED";
  return "NOVICE";
}

/**
 * Recalculate and update a user's reputation based on their activity.
 */
export async function updateReputation(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      reviewsReceived: true,
      tasksCreated: true,
      bids: { include: { task: true } },
      deliveries: { include: { task: true } },
      escrowsAsPayee: true,
      escrowsAsPayer: true,
    },
  });
  if (!user) return;

  const reviews = user.reviewsReceived;
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

  const completedDeliveries = user.deliveries.filter(
    (d) => d.status === "ACCEPTED"
  ).length;
  const totalBidsAccepted = user.bids.filter((b) => b.accepted).length;
  const completionRate =
    totalBidsAccepted > 0 ? (completedDeliveries / totalBidsAccepted) * 100 : 0;

  const totalEarnings = user.escrowsAsPayee
    .filter((e) => e.status === "RELEASED")
    .reduce((s, e) => s + e.amount - e.platformFee, 0);

  const totalSpent = user.escrowsAsPayer
    .filter((e) => e.status === "RELEASED" || e.status === "HELD")
    .reduce((s, e) => s + e.amount, 0);

  const tasksWithDisputes = user.deliveries.filter(
    (d) => d.task.status === "DISPUTED"
  ).length;
  const disputeRate =
    completedDeliveries + tasksWithDisputes > 0
      ? (tasksWithDisputes / (completedDeliveries + tasksWithDisputes)) * 100
      : 0;

  // Composite score: weighted combination
  const score =
    completionRate * 0.3 +
    avgRating * 20 * 0.3 +
    Math.min(totalEarnings / 100, 100) * 0.2 +
    (100 - disputeRate) * 0.2;

  const level = calculateLevel(score);

  await prisma.reputation.upsert({
    where: { userId },
    update: {
      completionRate,
      averageRating: avgRating,
      totalEarnings,
      totalSpent,
      disputeRate,
      tasksCompleted: completedDeliveries,
      tasksCreated: user.tasksCreated.length,
      level,
    },
    create: {
      userId,
      completionRate,
      averageRating: avgRating,
      totalEarnings,
      totalSpent,
      disputeRate,
      tasksCompleted: completedDeliveries,
      tasksCreated: user.tasksCreated.length,
      level,
    },
  });
}
