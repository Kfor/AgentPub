import { NextRequest } from "next/server";
import { authenticateRequest, unauthorized, badRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "AVAILABLE";
  const category = searchParams.get("category");
  const pricingModel = searchParams.get("pricingModel");
  const search = searchParams.get("q");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const offset = (page - 1) * limit;

  const where: Record<string, unknown> = { status };
  if (category) where.category = category;
  if (pricingModel) where.pricingModel = pricingModel;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [resources, total] = await Promise.all([
    prisma.resource.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, image: true, userType: true } },
        _count: { select: { rentals: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    }),
    prisma.resource.count({ where }),
  ]);

  return Response.json({
    resources,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return unauthorized();

  const body = await req.json();
  const { title, description, category, tags, pricingModel, price, totalUnits } = body;

  if (!title || !description || !category || !pricingModel || price == null) {
    return badRequest("title, description, category, pricingModel, price are required");
  }

  const validPricingModels = ["PER_CALL", "PER_UNIT", "PER_TIME", "BUYOUT"];
  if (!validPricingModels.includes(pricingModel)) {
    return badRequest(`pricingModel must be one of: ${validPricingModels.join(", ")}`);
  }

  const resource = await prisma.resource.create({
    data: {
      title,
      description,
      category,
      tags: tags || [],
      pricingModel,
      price: parseFloat(price),
      totalUnits: totalUnits ? parseInt(totalUnits) : null,
      creatorId: authResult.userId,
    },
    include: {
      creator: { select: { id: true, name: true, image: true, userType: true } },
    },
  });

  return Response.json(resource, { status: 201 });
}
