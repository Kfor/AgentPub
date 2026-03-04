import { Coinbase, Wallet, ExternalAddress } from "@coinbase/coinbase-sdk";

const CDP_NETWORK = process.env.CDP_NETWORK || "base-sepolia";

let configured = false;
let platformWallet: Wallet | null = null;

/**
 * Check if CDP credentials are present in environment.
 */
export function isCdpEnabled(): boolean {
  return !!(process.env.CDP_API_KEY_NAME && process.env.CDP_API_KEY_PRIVATE_KEY);
}

/**
 * Lazily configure the Coinbase SDK. No-op if already configured.
 */
function ensureConfigured(): void {
  if (configured) return;
  if (!isCdpEnabled()) {
    throw new Error("CDP is not enabled — missing CDP_API_KEY_NAME or CDP_API_KEY_PRIVATE_KEY");
  }
  Coinbase.configure({
    apiKeyName: process.env.CDP_API_KEY_NAME!,
    privateKey: process.env.CDP_API_KEY_PRIVATE_KEY!.replace(/\\n/g, "\n"),
  });
  configured = true;
}

/**
 * Get or create the platform wallet (singleton).
 * If CDP_WALLET_DATA is set, imports that wallet; otherwise creates a new one.
 */
export async function getPlatformWallet(): Promise<Wallet> {
  ensureConfigured();
  if (platformWallet) return platformWallet;

  const walletDataEnv = process.env.CDP_WALLET_DATA;
  if (walletDataEnv) {
    const data = JSON.parse(walletDataEnv);
    platformWallet = await Wallet.import(data);
  } else {
    platformWallet = await Wallet.create({ networkId: CDP_NETWORK });
    console.warn(
      "[CDP] Created new platform wallet. Export and set CDP_WALLET_DATA to persist it:",
      JSON.stringify(platformWallet.export()),
    );
  }

  return platformWallet;
}

/**
 * Transfer USDC from the platform wallet to a destination address (gasless on Base).
 */
export async function transferUSDC(
  destinationAddress: string,
  amount: number,
): Promise<{ txHash: string | undefined; status: string }> {
  const wallet = await getPlatformWallet();

  const transfer = await wallet.createTransfer({
    amount,
    assetId: Coinbase.assets.Usdc,
    destination: destinationAddress,
    gasless: true,
  });

  const completed = await transfer.wait({ timeoutSeconds: 60 });
  return {
    txHash: completed.getTransactionHash(),
    status: completed.getStatus() ?? "unknown",
  };
}

/**
 * Get the USDC balance of an external on-chain address via the CDP API.
 */
export async function getAddressBalance(address: string): Promise<number> {
  ensureConfigured();
  const externalAddress = new ExternalAddress(CDP_NETWORK, address);
  const balance = await externalAddress.getBalance(Coinbase.assets.Usdc);
  return balance.toNumber();
}
