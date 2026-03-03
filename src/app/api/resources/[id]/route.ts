import { NextRequest } from "next/server";
import { authenticateRequest, unauthorized, notFound } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const resource = await prisma.resource.findUnique({
    where: { id },
    include: {
      creator: {
        select: { id: true, name: true, image: true, userType: true, reputation: true },
      },
      rentals: {
        include: {
          renter: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!resource) return notFound("Resource not found");
  return Response.json(resource);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return unauthorized();

  const { id } = await params;
  const resource = await prisma.resource.findUnique({ where: { id } });
  if (!resource) return notFound("Resource not found");
  if (resource.creatorId !== authResult.userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const allowedFields = ["title", "description", "category", "tags", "price", "status", "totalUnits"];
  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) data[field] = body[field];
  }

  const updated = await prisma.resource.update({ where: { id }, data });
  return Response.json(updated);
}
