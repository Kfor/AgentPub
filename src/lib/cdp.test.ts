import { describe, it, expect } from "vitest";
import { createWallet, getBalance, transferUSDC } from "./cdp";

describe("createWallet (stub)", () => {
  it("returns a wallet with a valid address", async () => {
    const wallet = await createWallet();

    expect(wallet.address).toBeTruthy();
    expect(wallet.address).toMatch(/^0x[0-9a-f]{40}$/);
    expect(wallet.walletId).toContain("wallet_");
    expect(wallet.network).toBe("base-mainnet");
  });

  it("returns unique addresses on multiple calls", async () => {
    const w1 = await createWallet();
    const w2 = await createWallet();

    expect(w1.address).not.toBe(w2.address);
    expect(w1.walletId).not.toBe(w2.walletId);
  });
});

describe("getBalance (stub)", () => {
  it("returns mock balance for any address", async () => {
    const balance = await getBalance("0x1234567890abcdef1234567890abcdef12345678");

    expect(balance.usdc).toBe(1000);
    expect(balance.eth).toBe(0.01);
    expect(balance.address).toBe(
      "0x1234567890abcdef1234567890abcdef12345678"
    );
  });
});

describe("transferUSDC (stub)", () => {
  it("returns a successful transfer result", async () => {
    const result = await transferUSDC(
      "0xaaa0000000000000000000000000000000000000",
      "0xbbb0000000000000000000000000000000000000",
      100
    );

    expect(result.success).toBe(true);
    expect(result.amount).toBe(100);
    expect(result.from).toBe(
      "0xaaa0000000000000000000000000000000000000"
    );
    expect(result.to).toBe(
      "0xbbb0000000000000000000000000000000000000"
    );
    expect(result.transactionHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(result.status).toBe("confirmed");
  });
});
