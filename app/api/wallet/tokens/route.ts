import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getLiveSolPriceUsd, getLiveTokenPrices } from "@/app/api/prices/route";

const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

const RPC_TIMEOUT_MS = 4000;

function createRpcPromise<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`RPC timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

function getRpcEndpoints(network: string): string[] {
  if (network === "devnet") {
    const heliusKey = process.env.HELIUS_API_KEY || "0f54ec31-9ab8-496b-819a-0aa16338c5c1";
    return [
      `https://devnet.helius-rpc.com/?api-key=${heliusKey}`,
      "https://api.devnet.solana.com",
    ];
  }

  const heliusKey = process.env.HELIUS_API_KEY || "0f54ec31-9ab8-496b-819a-0aa16338c5c1";
  const list: string[] = [];
  if (heliusKey) {
    list.push(`https://mainnet.helius-rpc.com/?api-key=${heliusKey}`);
  }
  list.push("https://solana-rpc.publicnode.com");
  list.push("https://rpc.ankr.com/solana");
  list.push("https://api.mainnet-beta.solana.com");
  return list;
}

export interface WalletTokenHolding {
  mint: string;
  symbol: string;
  name: string;
  amount: number;
  decimals: number;
  priceUsd: number;
  valueUsd: number;
  priceChange24h?: number;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  const network = searchParams.get("network") || "mainnet";

  if (!address) {
    return NextResponse.json(
      { success: false, error: "Missing 'address' parameter" },
      { status: 400 }
    );
  }

  let pubKey: PublicKey;
  try {
    pubKey = new PublicKey(address);
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid Solana public key format" },
      { status: 400 }
    );
  }

  const solPriceUsd = await getLiveSolPriceUsd();
  const endpoints = getRpcEndpoints(network);

  let solLamports = 0;
  let allTokenAccounts: any[] = [];

  // Lấy dữ liệu on-chain qua RPC
  for (const endpoint of endpoints) {
    try {
      const conn = new Connection(endpoint, { commitment: "confirmed" });

      const [balanceRes, splRes, token2022Res] = await Promise.allSettled([
        createRpcPromise(conn.getBalance(pubKey), RPC_TIMEOUT_MS),
        createRpcPromise(
          conn.getParsedTokenAccountsByOwner(pubKey, { programId: TOKEN_PROGRAM_ID }),
          RPC_TIMEOUT_MS
        ),
        createRpcPromise(
          conn.getParsedTokenAccountsByOwner(pubKey, { programId: TOKEN_2022_PROGRAM_ID }),
          RPC_TIMEOUT_MS
        ),
      ]);

      if (balanceRes.status === "fulfilled") {
        solLamports = balanceRes.value;
      }
      if (splRes.status === "fulfilled" && splRes.value?.value) {
        allTokenAccounts.push(...splRes.value.value);
      }
      if (token2022Res.status === "fulfilled" && token2022Res.value?.value) {
        allTokenAccounts.push(...token2022Res.value.value);
      }

      if (balanceRes.status === "fulfilled") {
        break; // Đã truy vấn thành công
      }
    } catch {
      continue;
    }
  }

  const solBalance = Number((solLamports / LAMPORTS_PER_SOL).toFixed(4));
  const solValueUsd = Number((solBalance * solPriceUsd).toFixed(2));

  // Tập hợp các token có số dư > 0
  const mintAmounts = new Map<string, { amount: number; decimals: number }>();
  for (const account of allTokenAccounts) {
    const parsed = account?.account?.data?.parsed?.info;
    if (!parsed) continue;
    const mint = parsed.mint;
    const uiAmount = parsed.tokenAmount?.uiAmount;
    const decimals = parsed.tokenAmount?.decimals ?? 6;

    if (mint && typeof uiAmount === "number" && uiAmount > 0) {
      const current = mintAmounts.get(mint);
      mintAmounts.set(mint, {
        amount: (current?.amount || 0) + uiAmount,
        decimals,
      });
    }
  }

  const uniqueMints = Array.from(mintAmounts.keys());
  const tokenPrices = await getLiveTokenPrices(uniqueMints, solPriceUsd);

  const tokens: WalletTokenHolding[] = [];
  let totalTokenValueUsd = 0;

  for (const [mint, info] of mintAmounts.entries()) {
    const priceInfo = tokenPrices[mint];
    const priceUsd = priceInfo?.priceUsd || 0;
    const valueUsd = Number((info.amount * priceUsd).toFixed(2));
    totalTokenValueUsd += valueUsd;

    tokens.push({
      mint,
      symbol: priceInfo?.symbol || mint.slice(0, 4) + "..." + mint.slice(-4),
      name: priceInfo?.name || "SPL Token",
      amount: Number(info.amount.toFixed(info.decimals > 4 ? 4 : info.decimals)),
      decimals: info.decimals,
      priceUsd,
      valueUsd,
      priceChange24h: priceInfo?.priceChange24h,
    });
  }

  tokens.sort((a, b) => b.valueUsd - a.valueUsd);

  const totalPortfolioValueUsd = Number((solValueUsd + totalTokenValueUsd).toFixed(2));

  return NextResponse.json({
    success: true,
    address,
    network,
    solBalance,
    solPriceUsd,
    solValueUsd,
    tokens,
    totalTokenValueUsd: Number(totalTokenValueUsd.toFixed(2)),
    totalPortfolioValueUsd,
    timestamp: Date.now(),
  });
}
