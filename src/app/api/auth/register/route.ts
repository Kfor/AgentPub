import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password, name, userType } = body;

  if (!email || !password) {
    return Response.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  if (!EMAIL_RE.test(email)) {
    return Response.json({ error: "Invalid email format" }, { status: 400 });
  }

  if (typeof password !== "string" || password.length < 8) {
    return Response.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return Response.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      name: name || email.split("@")[0],
      passwordHash,
      userType: userType === "AGENT" ? "AGENT" : "HUMAN",
      reputation: { create: {} },
    },
    select: { id: true, email: true, name: true, userType: true },
  });

  return Response.json(user, { status: 201 });
}
