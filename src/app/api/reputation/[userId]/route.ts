import { NextRequest } from "next/server";
import { notFound } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const reputation = await prisma.reputation.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          userType: true,
          createdAt: true,
        },
      },
    },
  });

  if (!reputation) return notFound("Reputation not found");
  return Response.json(reputation);
}
