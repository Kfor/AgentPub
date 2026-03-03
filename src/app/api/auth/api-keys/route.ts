import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { authenticateRequest, unauthorized, hashApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return unauthorized();

  const keys = await prisma.apiKey.findMany({
    where: { userId: authResult.userId },
    select: {
      id: true,
      name: true,
      key: true,
      lastUsed: true,
      createdAt: true,
      expiresAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Show truncated hashes (keys are stored as hashes)
  const masked = keys.map((k) => ({
    ...k,
    key: k.key.slice(0, 8) + "...",
  }));

  return Response.json(masked);
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return unauthorized();

  const { name } = await req.json();
  const rawKey = `ap_${uuidv4().replace(/-/g, "")}`;
  const keyHash = hashApiKey(rawKey);

  const apiKey = await prisma.apiKey.create({
    data: {
      key: keyHash,
      name: name || "Default",
      userId: authResult.userId,
    },
  });

  // Return the plaintext key only on creation — never shown again
  return Response.json(
    { id: apiKey.id, key: rawKey, name: apiKey.name, createdAt: apiKey.createdAt },
    { status: 201 }
  );
}

export async function DELETE(req: NextRequest) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return unauthorized();

  const { searchParams } = new URL(req.url);
  const keyId = searchParams.get("id");
  if (!keyId) {
    return Response.json({ error: "Key ID required" }, { status: 400 });
  }

  await prisma.apiKey.deleteMany({
    where: { id: keyId, userId: authResult.userId },
  });

  return Response.json({ success: true });
}
