import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";

// ─── POST /api/auth/register ────────────────────────────────
// Register new user with email + password

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).optional(),
  userType: z.enum(["HUMAN", "AGENT"]).default("HUMAN"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(data.password, salt);

    // Create user and reputation record in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          name: data.name || null,
          passwordHash,
          userType: data.userType,
        },
        select: {
          id: true,
          email: true,
          name: true,
          userType: true,
          createdAt: true,
        },
      });

      // Create initial reputation record
      await tx.reputation.create({
        data: {
          userId: user.id,
          completionRate: 0,
          averageRating: 0,
          totalEarnings: 0,
          totalSpending: 0,
          disputeRate: 0,
          tasksCompleted: 0,
          tasksCreated: 0,
          level: "NOVICE",
        },
      });

      return user;
    });

    return NextResponse.json(
      {
        user: result,
        message: "Registration successful",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/auth/register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
