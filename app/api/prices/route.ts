import { NextRequest, NextResponse } from "next/server";

// Cache in-memory ngắn hạn (15s) để chống rate limit
let cachedSolPrice: { price: number; timestamp: number } | null = null;
const tokenPriceCache = new Map<string, { price: number; symbol?: string; timestamp: number }>();
const CACHE_TTL_MS = 15000;

export const WSOL_MINT = "So11111111111111111111111111111111111111112";

const STABLECOIN_MINTS = new Set([
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
  "USDH1SM1ojcxkgZsqq8smWYuhwpwgZX8Xgf64h87NL5", // USDH
  "2b1kV6cxmJJfdqPLsemFnmTvdDxYXQ32EAznJLxD5tjz", // PYUSD
  "USDSwr9ApdHk5bvJKMjzff41tpTrurggn3pnvcLTZ7G", // USDS
]);

// Danh sách các token phổ biến để fallback nếu API lỗi
const POPULAR_TOKEN_METADATA: Record<string, { symbol: string; name: string; defaultPrice: number }> = {
  [WSOL_MINT]: { symbol: "SOL", name: "Solana", defaultPrice: 185.0 },
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": { symbol: "USDC", name: "USD Coin", defaultPrice: 1.0 },
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": { symbol: "USDT", name: "Tether USD", defaultPrice: 1.0 },
  "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN": { symbol: "JUP", name: "Jupiter", defaultPrice: 0.95 },
  "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R": { symbol: "RAY", name: "Raydium", defaultPrice: 2.28 },
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": { symbol: "BONK", name: "Bonk", defaultPrice: 0.000024 },
  "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm": { symbol: "WIF", name: "dogwifhat", defaultPrice: 2.45 },
  "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr": { symbol: "POPCAT", name: "Popcat", defaultPrice: 1.18 },
  "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5": { symbol: "MEW", name: "cat in a dogs world", defaultPrice: 0.0075 },
  "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof": { symbol: "RENDER", name: "Render", defaultPrice: 5.1 },
  "HZ1JovNiRvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3": { symbol: "PYTH", name: "Pyth Network", defaultPrice: 0.42 },
  "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL": { symbol: "JTO", name: "Jito", defaultPrice: 2.4 },
};

/**
 * Lấy giá SOL trực tiếp với cơ chế đa nguồn (Binance -> Jupiter -> DexScreener -> CoinGecko)
 */
export async function getLiveSolPriceUsd(): Promise<number> {
  const now = Date.now();
  if (cachedSolPrice && now - cachedSolPrice.timestamp < CACHE_TTL_MS) {
    return cachedSolPrice.price;
  }

  // 1. Binance Ticker (Cực nhanh và ổn định cao)
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT", {
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const price = parseFloat(data?.price);
      if (price > 0) {
        cachedSolPrice = { price, timestamp: now };
        return price;
      }
    }
  } catch {
    // Thử nguồn kế tiếp
  }

  // 2. Jupiter Price API v2
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`https://api.jup.ag/price/v2?ids=${WSOL_MINT}`, {
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const p = parseFloat(data?.data?.[WSOL_MINT]?.price);
      if (p > 0) {
        cachedSolPrice = { price: p, timestamp: now };
        return p;
      }
    }
  } catch {
    // Thử nguồn kế tiếp
  }

  // 3. DexScreener SOL pair
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${WSOL_MINT}`, {
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const pairs = Array.isArray(data) ? data : data?.pairs;
      if (pairs && pairs.length > 0) {
        const p = parseFloat(pairs[0]?.priceUsd);
        if (p > 0) {
          cachedSolPrice = { price: p, timestamp: now };
          return p;
        }
      }
    }
  } catch {
    // Thử nguồn kế tiếp
  }

  // 4. CoinGecko simple price
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd", {
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const p = parseFloat(data?.solana?.usd);
      if (p > 0) {
        cachedSolPrice = { price: p, timestamp: now };
        return p;
      }
    }
  } catch {
    // Fallback
  }

  return cachedSolPrice?.price || 185.0;
}

/**
 * Lấy giá nhiều SPL token qua DexScreener & Jupiter
 */
export async function getLiveTokenPrices(
  mints: string[],
  solPriceUsd: number
): Promise<Record<string, { priceUsd: number; symbol?: string; name?: string; priceChange24h?: number }>> {
  const result: Record<string, { priceUsd: number; symbol?: string; name?: string; priceChange24h?: number }> = {};
  const now = Date.now();
  const mintsToFetch: string[] = [];

  for (const m of mints) {
    if (!m) continue;
    if (m === WSOL_MINT) {
      result[m] = { priceUsd: solPriceUsd, symbol: "SOL", name: "Solana" };
      continue;
    }
    if (STABLECOIN_MINTS.has(m)) {
      result[m] = {
        priceUsd: 1.0,
        symbol: POPULAR_TOKEN_METADATA[m]?.symbol || "USD",
        name: POPULAR_TOKEN_METADATA[m]?.name || "Stablecoin",
      };
      continue;
    }

    const cached = tokenPriceCache.get(m);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      result[m] = {
        priceUsd: cached.price,
        symbol: cached.symbol || POPULAR_TOKEN_METADATA[m]?.symbol,
        name: POPULAR_TOKEN_METADATA[m]?.name,
      };
    } else {
      mintsToFetch.push(m);
    }
  }

  if (mintsToFetch.length === 0) {
    return result;
  }

  // 1. DexScreener Batch Fetch (Tối đa 30 mints mỗi chunk)
  const chunks: string[][] = [];
  for (let i = 0; i < mintsToFetch.length; i += 30) {
    chunks.push(mintsToFetch.slice(i, i + 30));
  }

  for (const chunk of chunks) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${chunk.join(",")}`, {
        signal: ctrl.signal,
        cache: "no-store",
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        const pairs: any[] = Array.isArray(data) ? data : data?.pairs || [];

        pairs.forEach((pair) => {
          const baseMint = pair.baseToken?.address;
          if (baseMint && !result[baseMint]) {
            const priceUsd = parseFloat(pair.priceUsd || "0");
            if (priceUsd > 0) {
              const symbol = pair.baseToken?.symbol;
              const name = pair.baseToken?.name;
              const priceChange24h = pair.priceChange?.h24 ? parseFloat(pair.priceChange.h24) : undefined;

              result[baseMint] = { priceUsd, symbol, name, priceChange24h };
              tokenPriceCache.set(baseMint, { price: priceUsd, symbol, timestamp: now });
            }
          }
        });
      }
    } catch {
      // Tiếp tục thử chunk kế tiếp
    }
  }

  // 2. Với các mint còn thiếu, thử Jupiter Price API v2
  const stillMissing = mintsToFetch.filter((m) => !result[m] || result[m].priceUsd <= 0);
  if (stillMissing.length > 0) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 2500);
      const res = await fetch(`https://api.jup.ag/price/v2?ids=${stillMissing.join(",")}`, {
        signal: ctrl.signal,
        cache: "no-store",
      });
      clearTimeout(timer);

      if (res.ok) {
        const jupData = await res.json();
        const dataObj = jupData?.data || {};
        for (const m of stillMissing) {
          if (dataObj[m]?.price) {
            const p = parseFloat(dataObj[m].price);
            if (p > 0) {
              result[m] = {
                priceUsd: p,
                symbol: POPULAR_TOKEN_METADATA[m]?.symbol,
                name: POPULAR_TOKEN_METADATA[m]?.name,
              };
              tokenPriceCache.set(m, { price: p, symbol: POPULAR_TOKEN_METADATA[m]?.symbol, timestamp: now });
            }
          }
        }
      }
    } catch {
      // Fallback
    }
  }

  // 3. Với các token vẫn thiếu, dùng metadata phổ biến nếu có
  for (const m of mintsToFetch) {
    if (!result[m] || result[m].priceUsd <= 0) {
      const fallback = POPULAR_TOKEN_METADATA[m];
      if (fallback) {
        result[m] = {
          priceUsd: fallback.defaultPrice,
          symbol: fallback.symbol,
          name: fallback.name,
        };
      }
    }
  }

  return result;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mintsParam = searchParams.get("mints");

  try {
    const solPrice = await getLiveSolPriceUsd();

    let tokenPrices: Record<string, { priceUsd: number; symbol?: string; name?: string; priceChange24h?: number }> = {};
    if (mintsParam) {
      const mints = mintsParam.split(",").map((s) => s.trim()).filter(Boolean);
      tokenPrices = await getLiveTokenPrices(mints, solPrice);
    }

    return NextResponse.json({
      success: true,
      solPriceUsd: solPrice,
      tokenPrices,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to fetch prices",
        solPriceUsd: cachedSolPrice?.price || 185.0,
      },
      { status: 500 }
    );
  }
}
