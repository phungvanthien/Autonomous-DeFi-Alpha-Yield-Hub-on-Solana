import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

// Ngưỡng timeout cho mỗi RPC call để không bị treo
const RPC_TIMEOUT_MS = 4000;

function createRpcPromise<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`RPC timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

/**
 * Danh sách endpoint RPC Mainnet có tự động dự phòng
 */
function getMainnetRpcEndpoints(): { name: string; url: string }[] {
  const heliusKey = process.env.HELIUS_API_KEY || "0f54ec31-9ab8-496b-819a-0aa16338c5c1";
  const fluxKey = process.env.FLUX_RPC_API_KEY || "35028ec9-0ed1-4e3b-8e09-04462868039e";
  const endpoints: { name: string; url: string }[] = [];

  // 1. Helius RPC
  if (heliusKey) {
    endpoints.push({
      name: "Helius RPC",
      url: `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`,
    });
  }

  // 2. Flux RPC
  if (process.env.FLUX_RPC_URL) {
    const cleanUrl = process.env.FLUX_RPC_URL.replace(/\/+$/, "");
    endpoints.push({
      name: "Flux RPC",
      url: fluxKey ? `${cleanUrl}?key=${fluxKey}` : cleanUrl,
    });
  }

  // 3. Custom Solana RPC từ biến môi trường
  if (process.env.SOLANA_RPC_URL && process.env.SOLANA_RPC_URL !== "https://api.mainnet-beta.solana.com") {
    endpoints.push({
      name: "Custom Solana RPC",
      url: process.env.SOLANA_RPC_URL,
    });
  }

  // 4. Các public nodes chất lượng cao
  endpoints.push({
    name: "Solana PublicNode",
    url: "https://solana-rpc.publicnode.com",
  });
  endpoints.push({
    name: "Ankr Solana",
    url: "https://rpc.ankr.com/solana",
  });
  endpoints.push({
    name: "Solana Foundation Public",
    url: "https://api.mainnet-beta.solana.com",
  });

  return endpoints;
}

/**
 * Danh sách endpoint RPC Devnet
 */
function getDevnetRpcEndpoints(): { name: string; url: string }[] {
  const heliusKey = process.env.HELIUS_API_KEY || "0f54ec31-9ab8-496b-819a-0aa16338c5c1";
  const endpoints: { name: string; url: string }[] = [];

  if (heliusKey) {
    endpoints.push({
      name: "Helius Devnet",
      url: `https://devnet.helius-rpc.com/?api-key=${heliusKey}`,
    });
  }

  endpoints.push({
    name: "Solana Devnet Official",
    url: "https://api.devnet.solana.com",
  });

  return endpoints;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  const network = searchParams.get("network") || "mainnet";

  if (!address) {
    return NextResponse.json(
      { success: false, error: "Missing 'address' query parameter" },
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

  const endpoints = network === "devnet" ? getDevnetRpcEndpoints() : getMainnetRpcEndpoints();
  let lamports: number | null = null;
  let successfulSource: string = "";

  // Thử lần lượt từng RPC endpoint cho đến khi thành công
  for (const ep of endpoints) {
    try {
      const conn = new Connection(ep.url, { commitment: "confirmed" });
      const balance = await createRpcPromise(conn.getBalance(pubKey), RPC_TIMEOUT_MS);
      lamports = balance;
      successfulSource = ep.name;
      break;
    } catch {
      // Tiếp tục thử endpoint kế tiếp
      continue;
    }
  }

  if (lamports === null) {
    return NextResponse.json(
      {
        success: false,
        error: "All Solana RPC endpoints timed out or failed to query balance",
        address,
        network,
      },
      { status: 503 }
    );
  }

  const solBalance = Number((lamports / LAMPORTS_PER_SOL).toFixed(4));

  // Nếu trên Mainnet số dư = 0, kiểm tra nhanh xem ví có đang có số dư trên Devnet không
  // để hỗ trợ thông báo gợi ý người dùng nếu họ đang dùng ví test Devnet
  let devnetBalance: number | undefined = undefined;
  if (network === "mainnet" && solBalance === 0) {
    try {
      const devnetConn = new Connection("https://api.devnet.solana.com", "confirmed");
      const devnetLamports = await createRpcPromise(devnetConn.getBalance(pubKey), 2500);
      if (devnetLamports > 0) {
        devnetBalance = Number((devnetLamports / LAMPORTS_PER_SOL).toFixed(4));
      }
    } catch {
      // Bỏ qua nếu devnet RPC bận
    }
  }

  return NextResponse.json(
    {
      success: true,
      address,
      balance: solBalance,
      lamports,
      network,
      devnetBalance,
      source: successfulSource,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
      },
    }
  );
}
