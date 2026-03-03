import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { createWallet, getBalance } from "@/lib/cdp";

// ─── GET /api/wallet ────────────────────────────────────────
// Get wallet info (balance, address)

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.walletAddress) {
      return NextResponse.json(
        {
          error: "No wallet found. Create one first.",
          hasWallet: false,
        },
        { status: 404 }
      );
    }

    const balance = await getBalance(user.walletAddress);

    return NextResponse.json({
      hasWallet: true,
      wallet: {
        address: user.walletAddress,
        balance: balance.usdc.toFixed(2),
        currency: "USDC",
        network: "base-sepolia",
      },
    });
  } catch (error) {
    console.error("GET /api/wallet error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST /api/wallet ───────────────────────────────────────
// Create wallet

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.walletAddress) {
      return NextResponse.json(
        {
          error: "Wallet already exists",
          wallet: {
            address: user.walletAddress,
          },
        },
        { status: 409 }
      );
    }

    const wallet = await createWallet();

    // Save wallet address to user record
    await prisma.user.update({
      where: { id: user.id },
      data: { walletAddress: wallet.address },
    });

    return NextResponse.json(
      {
        wallet: {
          address: wallet.address,
          network: wallet.network,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/wallet error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
