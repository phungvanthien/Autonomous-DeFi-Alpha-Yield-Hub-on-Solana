import { NextRequest, NextResponse } from "next/server";
import { Connection } from "@solana/web3.js";

const RPC_TIMEOUT_MS = 12000;

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rawTransactionBase64, network = "mainnet" } = body;

    if (!rawTransactionBase64) {
      return NextResponse.json(
        { success: false, error: "Missing rawTransactionBase64" },
        { status: 400 }
      );
    }

    const txBuffer = Buffer.from(rawTransactionBase64, "base64");
    const endpoints = network === "devnet" ? getDevnetRpcEndpoints() : getMainnetRpcEndpoints();

    let lastError: any = null;

    for (const ep of endpoints) {
      try {
        const conn = new Connection(ep, "confirmed");
        let signature = "";
        try {
          signature = await conn.sendRawTransaction(txBuffer, {
            skipPreflight: false,
            preflightCommitment: "confirmed",
            maxRetries: 3,
          });
        } catch {
          // Nếu preflight simulation bị lỗi tạm thời, thử phát trực tiếp
          signature = await conn.sendRawTransaction(txBuffer, {
            skipPreflight: true,
            preflightCommitment: "confirmed",
            maxRetries: 3,
          });
        }

        if (signature) {
          return NextResponse.json({
            success: true,
            signature,
          });
        }
      } catch (err: any) {
        lastError = err?.message || String(err);
        continue;
      }
    }

    return NextResponse.json(
      { success: false, error: lastError || "Failed to broadcast transaction on all endpoints" },
      { status: 502 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
