import { NextRequest, NextResponse } from "next/server";
import { Connection } from "@solana/web3.js";

const RPC_TIMEOUT_MS = 5000;

function createRpcPromise<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`RPC timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

function getMainnetRpcEndpoints(): string[] {
  const heliusKey = process.env.HELIUS_API_KEY || "0f54ec31-9ab8-496b-819a-0aa16338c5c1";
  const fluxKey = process.env.FLUX_RPC_API_KEY || "35028ec9-0ed1-4e3b-8e09-04462868039e";
  const list: string[] = [];

  if (heliusKey) {
    list.push(`https://mainnet.helius-rpc.com/?api-key=${heliusKey}`);
  }
  if (process.env.FLUX_RPC_URL) {
    const cleanUrl = process.env.FLUX_RPC_URL.replace(/\/+$/, "");
    list.push(fluxKey ? `${cleanUrl}?key=${fluxKey}` : cleanUrl);
  }
  if (process.env.SOLANA_RPC_URL && process.env.SOLANA_RPC_URL !== "https://api.mainnet-beta.solana.com") {
    list.push(process.env.SOLANA_RPC_URL);
  }
  list.push("https://solana-rpc.publicnode.com");
  list.push("https://rpc.ankr.com/solana");
  list.push("https://api.mainnet-beta.solana.com");
  return list;
}

function getDevnetRpcEndpoints(): string[] {
  const heliusKey = process.env.HELIUS_API_KEY || "0f54ec31-9ab8-496b-819a-0aa16338c5c1";
  const list: string[] = [];
  if (heliusKey) {
    list.push(`https://devnet.helius-rpc.com/?api-key=${heliusKey}`);
  }
  list.push("https://api.devnet.solana.com");
  return list;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const network = searchParams.get("network") || "mainnet";
  const endpoints = network === "devnet" ? getDevnetRpcEndpoints() : getMainnetRpcEndpoints();

  for (const ep of endpoints) {
    try {
      const conn = new Connection(ep, "confirmed");
      const { blockhash, lastValidBlockHeight } = await createRpcPromise(
        conn.getLatestBlockhash("confirmed"),
        RPC_TIMEOUT_MS
      );
      if (blockhash) {
        return NextResponse.json({
          success: true,
          blockhash,
          lastValidBlockHeight,
        });
      }
    } catch {
      continue;
    }
  }

  return NextResponse.json(
    { success: false, error: "Failed to fetch blockhash from all RPCs" },
    { status: 503 }
  );
}
