import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/resources/[id] ────────────────────────────────
// Get single resource with owner info

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const resource = await prisma.resource.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            userType: true,
          },
        },
        rentals: {
          where: { active: true },
          orderBy: { startedAt: "desc" },
          take: 10,
        },
      },
    });

    if (!resource) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(resource);
  } catch (error) {
    console.error("GET /api/resources/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PUT /api/resources/[id] ────────────────────────────────
// Update resource (only owner)

const updateResourceSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(10000).optional(),
  type: z
    .enum([
      "API_CREDITS",
      "DATASET",
      "COMPUTE",
      "TOOL_ACCESS",
      "CONSULTING",
      "OTHER",
    ])
    .optional(),
  pricingModel: z
    .enum(["PER_USE", "PER_UNIT", "TIME_BASED", "BUYOUT"])
    .optional(),
  price: z.number().nonnegative().optional(),
  currency: z.string().optional(),
  status: z.enum(["AVAILABLE", "OCCUPIED", "DELISTED"]).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function PUT(
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

    if (resource.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Only the resource owner can update this resource" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = updateResourceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.pricingModel !== undefined) updateData.pricingModel = data.pricingModel;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;

    const updated = await prisma.resource.update({
      where: { id },
      data: updateData,
      include: {
        owner: {
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/resources/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/resources/[id] ─────────────────────────────
// Delist resource (only owner, set status DELISTED)

export async function DELETE(
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

    if (resource.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Only the resource owner can delist this resource" },
        { status: 403 }
      );
    }

    if (resource.status === "DELISTED") {
      return NextResponse.json(
        { error: "Resource is already delisted" },
        { status: 400 }
      );
    }

    const delisted = await prisma.resource.update({
      where: { id },
      data: { status: "DELISTED" },
    });

    return NextResponse.json(delisted);
  } catch (error) {
    console.error("DELETE /api/resources/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
