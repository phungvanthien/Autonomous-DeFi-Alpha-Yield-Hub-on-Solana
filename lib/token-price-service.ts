/**
 * Dịch vụ lấy và đồng bộ giá thời gian thực cho SOL và các SPL Token trên Solana
 */

export interface TokenPriceInfo {
  priceUsd: number;
  symbol?: string;
  name?: string;
  priceChange24h?: number;
}

let clientSolPriceCache: { price: number; timestamp: number } | null = null;
const clientTokenPriceCache = new Map<string, { info: TokenPriceInfo; timestamp: number }>();
const CLIENT_CACHE_TTL = 15000; // 15 giây

/**
 * Lấy giá SOL hiện tại tính bằng USD (Live Price)
 */
export async function fetchLiveSolPrice(): Promise<number> {
  const now = Date.now();
  if (clientSolPriceCache && now - clientSolPriceCache.timestamp < CLIENT_CACHE_TTL) {
    return clientSolPriceCache.price;
  }

  try {
    const res = await fetch("/api/prices", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.solPriceUsd === "number" && data.solPriceUsd > 0) {
        clientSolPriceCache = { price: data.solPriceUsd, timestamp: now };
        return data.solPriceUsd;
      }
    }
  } catch {
    // Fallback thử trực tiếp DexScreener nếu API nội bộ bị lỗi
  }

  // Fallback trực tiếp qua DexScreener client-side
  try {
    const res = await fetch(
      "https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112",
      { cache: "no-store" }
    );
    if (res.ok) {
      const data = await res.json();
      const pairs = Array.isArray(data) ? data : data?.pairs;
      if (pairs && pairs.length > 0) {
        const p = parseFloat(pairs[0]?.priceUsd);
        if (p > 0) {
          clientSolPriceCache = { price: p, timestamp: now };
          return p;
        }
      }
    }
  } catch {
    // ignore
  }

  return clientSolPriceCache?.price || 185.0;
}

/**
 * Lấy giá cho danh sách các token mints
 */
export async function fetchLiveTokenPrices(
  mints: string[]
): Promise<Record<string, TokenPriceInfo>> {
  if (!mints || mints.length === 0) return {};

  const uniqueMints = Array.from(new Set(mints.filter(Boolean)));
  const results: Record<string, TokenPriceInfo> = {};
  const uncachedMints: string[] = [];
  const now = Date.now();

  for (const m of uniqueMints) {
    const cached = clientTokenPriceCache.get(m);
    if (cached && now - cached.timestamp < CLIENT_CACHE_TTL) {
      results[m] = cached.info;
    } else {
      uncachedMints.push(m);
    }
  }

  if (uncachedMints.length === 0) {
    return results;
  }

  try {
    const res = await fetch(`/api/prices?mints=${encodeURIComponent(uncachedMints.join(","))}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.tokenPrices) {
        for (const [mint, info] of Object.entries(data.tokenPrices)) {
          const typedInfo = info as TokenPriceInfo;
          results[mint] = typedInfo;
          clientTokenPriceCache.set(mint, { info: typedInfo, timestamp: now });
        }
      }
    }
  } catch {
    // Fallback
  }

  return results;
}
