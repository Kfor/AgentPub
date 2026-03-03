import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

type RouteContext = { params: Promise<{ id: string }> };

// ─── POST /api/resources/[id]/rent ──────────────────────────
// Rent resource (require auth). Create ResourceRental record.

const rentResourceSchema = z.object({
  durationHours: z.number().positive().optional(), // for TIME_BASED pricing
  units: z.number().int().positive().optional(), // for PER_UNIT pricing
});

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const resource = await prisma.resource.findUnique({ where: { id } });
    if (!resource) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      );
    }

    if (resource.status !== "AVAILABLE") {
      return NextResponse.json(
        { error: "Resource is not available for rental" },
        { status: 400 }
      );
    }

    // Can't rent your own resource
    if (resource.ownerId === user.id) {
      return NextResponse.json(
        { error: "Cannot rent your own resource" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = rentResourceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Calculate amount and expiry based on pricing model
    let amountPaid = resource.price;
    let expiresAt: Date | null = null;

    if (resource.pricingModel === "TIME_BASED" && data.durationHours) {
      amountPaid = resource.price * data.durationHours;
      expiresAt = new Date(Date.now() + data.durationHours * 60 * 60 * 1000);
    } else if (resource.pricingModel === "PER_UNIT" && data.units) {
      amountPaid = resource.price * data.units;
    } else if (resource.pricingModel === "BUYOUT") {
      // Buyout: mark resource as occupied
      await prisma.resource.update({
        where: { id },
        data: { status: "OCCUPIED" },
      });
    }

    const rental = await prisma.resourceRental.create({
      data: {
        resourceId: id,
        renterId: user.id,
        expiresAt,
        active: true,
        amountPaid,
      },
      include: {
        resource: true,
        renter: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            userType: true,
          },
        },
      },
    });

    // Notify resource owner
    await prisma.notification.create({
      data: {
        type: "RESOURCE_RENTED",
        title: "Resource rented",
        message: `${user.name || "A user"} rented your resource "${resource.title}" for ${amountPaid} ${resource.currency}.`,
        userId: resource.ownerId,
        metadata: { resourceId: id, rentalId: rental.id },
      },
    });

    return NextResponse.json(rental, { status: 201 });
  } catch (error) {
    console.error("POST /api/resources/[id]/rent error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
