/**
 * CDP (Coinbase Developer Platform) Server Wallet stub.
 *
 * In production, these functions would use the real Coinbase CDP SDK
 * (@coinbase/coinbase-sdk) to create and manage server-side wallets,
 * check USDC balances, and execute on-chain transfers on Base.
 *
 * For now, all functions return mock data and log their intended operations.
 */

export interface WalletInfo {
  /** The wallet's unique identifier in the CDP system */
  walletId: string;
  /** The on-chain address (Base network) */
  address: string;
  /** The network the wallet is on */
  network: string;
}

export interface TransferResult {
  /** Whether the transfer was successful */
  success: boolean;
  /** The on-chain transaction hash */
  transactionHash: string;
  /** Amount transferred in USDC */
  amount: number;
  /** Sender address */
  from: string;
  /** Recipient address */
  to: string;
  /** Status message */
  status: string;
}

export interface BalanceInfo {
  /** USDC balance */
  usdc: number;
  /** ETH balance (for gas) */
  eth: number;
  /** The wallet address */
  address: string;
}

/**
 * Create a new CDP server wallet.
 *
 * In production, this would call:
 *   const wallet = await Wallet.create({ networkId: "base-mainnet" });
 *
 * @returns Mock wallet info with a generated address
 */
export async function createWallet(): Promise<WalletInfo> {
  const mockAddress = `0x${Array.from({ length: 40 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("")}`;

  const walletInfo: WalletInfo = {
    walletId: `wallet_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    address: mockAddress,
    network: "base-mainnet",
  };

  console.log("[CDP Stub] createWallet:", JSON.stringify(walletInfo, null, 2));

  return walletInfo;
}

/**
 * Get the USDC and ETH balance of a wallet.
 *
 * In production, this would call:
 *   const balances = await wallet.listBalances();
 *
 * @param address - The wallet address to check
 * @returns Mock balance information
 */
export async function getBalance(address: string): Promise<BalanceInfo> {
  const balanceInfo: BalanceInfo = {
    usdc: 1000.0,
    eth: 0.01,
    address,
  };

  console.log(
    "[CDP Stub] getBalance for",
    address,
    ":",
    JSON.stringify(balanceInfo, null, 2)
  );

  return balanceInfo;
}

/**
 * Transfer USDC from one address to another on Base.
 *
 * In production, this would call:
 *   const transfer = await wallet.createTransfer({
 *     amount: amount,
 *     assetId: "usdc",
 *     destination: toAddress,
 *   });
 *   await transfer.wait();
 *
 * @param fromAddress - Sender wallet address
 * @param toAddress - Recipient wallet address
 * @param amount - Amount of USDC to transfer
 * @returns Mock transfer result
 */
export async function transferUSDC(
  fromAddress: string,
  toAddress: string,
  amount: number
): Promise<TransferResult> {
  const mockTxHash = `0x${Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("")}`;

  const result: TransferResult = {
    success: true,
    transactionHash: mockTxHash,
    amount,
    from: fromAddress,
    to: toAddress,
    status: "confirmed",
  };

  console.log(
    "[CDP Stub] transferUSDC:",
    `${amount} USDC from ${fromAddress} to ${toAddress}`,
    `| tx: ${mockTxHash}`
  );

  return result;
}
