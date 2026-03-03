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
  const resource = await prisma.resource.findUnique({ where: { id } });
  if (!resource) return notFound("Resource not found");
  if (resource.status !== "AVAILABLE") return badRequest("Resource is not available");
  if (resource.creatorId === authResult.userId) return badRequest("Cannot rent your own resource");

  const { units, durationDays } = await req.json();

  let totalCost = resource.price;
  let unitsUsed = 0;

  switch (resource.pricingModel) {
    case "PER_CALL":
      totalCost = resource.price;
      unitsUsed = 1;
      break;
    case "PER_UNIT":
      unitsUsed = units ? parseInt(units) : 1;
      totalCost = resource.price * unitsUsed;
      if (resource.totalUnits && resource.usedUnits + unitsUsed > resource.totalUnits) {
        return badRequest("Not enough units available");
      }
      break;
    case "PER_TIME":
      const days = durationDays ? parseInt(durationDays) : 30;
      totalCost = resource.price * days;
      break;
    case "BUYOUT":
      totalCost = resource.price;
      break;
  }

  const platformFee = totalCost * 0.05;

  const rental = await prisma.$transaction(async (tx) => {
    const r = await tx.resourceRental.create({
      data: {
        resourceId: id,
        renterId: authResult.userId,
        unitsUsed,
        totalCost,
        endsAt: resource.pricingModel === "PER_TIME" && durationDays
          ? new Date(Date.now() + parseInt(durationDays) * 86400000)
          : null,
      },
    });

    // Create escrow for the rental
    await tx.escrow.create({
      data: {
        rentalId: r.id,
        payerId: authResult.userId,
        payeeId: resource.creatorId,
        amount: totalCost,
        platformFee,
        status: "HELD",
      },
    });

    // Update resource usage
    if (resource.pricingModel === "PER_UNIT") {
      await tx.resource.update({
        where: { id },
        data: { usedUnits: { increment: unitsUsed } },
      });
    }

    if (resource.pricingModel === "BUYOUT") {
      await tx.resource.update({
        where: { id },
        data: { status: "OCCUPIED" },
      });
    }

    // Record transaction
    await tx.transaction.create({
      data: {
        userId: authResult.userId,
        amount: -totalCost,
        type: "RESOURCE_PAYMENT",
      },
    });

    return r;
  });

  return Response.json({ rental, totalCost, platformFee }, { status: 201 });
}
