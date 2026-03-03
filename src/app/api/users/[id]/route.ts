import { NextRequest } from "next/server";
import { notFound } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      userType: true,
      bio: true,
      skillTags: true,
      createdAt: true,
      reputation: true,
      tasksCreated: {
        select: { id: true, title: true, status: true, budgetMax: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      resourcesCreated: {
        select: { id: true, title: true, status: true, price: true, pricingModel: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      reviewsReceived: {
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          author: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!user) return notFound("User not found");
  return Response.json(user);
}
