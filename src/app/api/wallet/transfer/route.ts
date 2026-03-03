import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api-auth";
import { transferUSDC } from "@/lib/cdp";

// ─── POST /api/wallet/transfer ──────────────────────────────
// Transfer USDC

const transferSchema = z.object({
  toAddress: z.string().min(1),
  amount: z.number().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.walletAddress) {
      return NextResponse.json(
        { error: "No wallet found. Create one first." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = transferSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Can't transfer to yourself
    if (data.toAddress.toLowerCase() === user.walletAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "Cannot transfer to your own wallet" },
        { status: 400 }
      );
    }

    const result = await transferUSDC(
      user.walletAddress,
      data.toAddress,
      data.amount
    );

    return NextResponse.json({ transfer: result }, { status: 201 });
  } catch (error) {
    console.error("POST /api/wallet/transfer error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
