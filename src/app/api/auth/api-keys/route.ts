import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/db";
import { requireAuth, hashApiKey } from "@/lib/api-auth";

// ─── GET /api/auth/api-keys ────────────────────────────────
// List user's API keys (require auth)

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        lastUsed: true,
        expiresAt: true,
        revoked: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(apiKeys);
  } catch (error) {
    console.error("GET /api/auth/api-keys error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST /api/auth/api-keys ───────────────────────────────
// Create new API key (require auth)

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  expiresInDays: z.number().int().positive().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = createApiKeySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Generate raw API key — shown to user once, then only hash is stored
    const rawKey = `agentpub_${uuidv4().replace(/-/g, "")}`;
    const keyHash = hashApiKey(rawKey);

    let expiresAt: Date | null = null;
    if (data.expiresInDays) {
      expiresAt = new Date(
        Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000
      );
    }

    const apiKey = await prisma.apiKey.create({
      data: {
        key: keyHash,
        name: data.name,
        userId: user.id,
        expiresAt,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    // Return the raw key only on creation (it won't be recoverable)
    return NextResponse.json(
      {
        apiKey: {
          ...apiKey,
          key: rawKey,
        },
        message:
          "API key created. Please save this key - it will not be shown again.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/auth/api-keys error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/auth/api-keys ──────────────────────────────
// Revoke an API key

const deleteApiKeySchema = z.object({
  id: z.string().min(1),
});

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = deleteApiKeySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { id } = validation.data;

    const apiKey = await prisma.apiKey.findUnique({ where: { id } });
    if (!apiKey || apiKey.userId !== user.id) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    await prisma.apiKey.update({
      where: { id },
      data: { revoked: true },
    });

    return NextResponse.json({ message: "API key revoked" });
  } catch (error) {
    console.error("DELETE /api/auth/api-keys error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
