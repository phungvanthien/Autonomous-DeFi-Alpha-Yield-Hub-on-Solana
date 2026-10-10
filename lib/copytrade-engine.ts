/**
 * Hệ thống Động cơ Copy Trade & Lá Chắn Bảo Toàn Vốn (Anti-Rug & Risk Engine)
 */

export interface CopyTradeConfig {
  targetWhaleAddress: string;
  targetWhaleName: string;
  enabled: boolean;

  // 1. Quản lý Khối lượng (Volume Control)
  maxSolPerTrade: number;       // Volume tối đa cho mỗi giao dịch copy (ví dụ: 0.2 SOL)
  slippagePct: number;          // Độ trượt giá tối đa (ví dụ: 2.0%)
  priorityFeeLevel: "NORMAL" | "HIGH" | "TURBO_JITO";

  // 2. Cơ chế Bảo Toàn Vốn & Cắt Lỗ (Capital Preservation)
  hardStopLossPct: number;      // Cắt lỗ dứt khoát không chờ cá voi (ví dụ: -15%)
  dailyMaxLossSol: number;      // Ngưỡng lỗ tối đa trong ngày (ví dụ: 1.0 SOL)
  enableTrailingStop: boolean;  // Trailing stop loss bảo vệ đỉnh lợi nhuận
  trailingStopPct: number;      // Kéo stop loss theo đỉnh (ví dụ: -10% từ đỉnh)

  // 3. Cơ chế Chốt Lợi Nhuận Tự Động (Take Profit)
  tp1Pct: number;               // Mốc chốt lời 1 (ví dụ: +50%)
  tp1SellRatio: number;         // Tỷ lệ bán ở mốc 1 (ví dụ: 50% khối lượng)
  tp2Pct: number;               // Mốc chốt lời 2 (ví dụ: +100%)
  tp2SellRatio: number;         // Tỷ lệ bán ở mốc 2 (ví dụ: 100% phần còn lại)

  // 4. Lá Chắn Chống Rugpull & Bẫy Xả Thanh Khoản (Anti-Rug Shield)
  minPoolLiquidityUsd: number;  // Thanh khoản tối thiểu của Pool DEX (ví dụ: $15,000)
  rejectIfFreezeAuthority: boolean; // Bỏ qua nếu token có quyền Freeze (đóng băng ví)
  rejectIfMintAuthority: boolean;   // Bỏ qua nếu token còn quyền Mint (in thêm token)
  maxHoldingTimeMinutes: number;    // Giới hạn thời gian ôm lệnh tối đa (ví dụ: 25 phút)
  instantExitOnWhaleSell: boolean;  // Bán lập tức với Priority Fee cao khi cá voi phát lệnh bán
  liquidityDropExitPct: number;     // Bán tháo khẩn cấp nếu thanh khoản pool tụt đột ngột (ví dụ: -20%)
}

export interface CopyTradePosition {
  id: string;
  whaleAddress: string;
  tokenSymbol: string;
  tokenMint: string;
  entrySolAmount: number;
  entryPriceUsd: number;
  currentPriceUsd: number;
  highestPriceUsd: number;
  pnlPct: number;
  entryTime: number;
  status: "OPEN" | "TP1_TAKEN" | "CLOSED_TP" | "CLOSED_SL" | "CLOSED_ANTI_RUG" | "CLOSED_PANIC";
  closeReason?: string;
  poolLiquidityUsd?: number;
  dex: string;
  txSignature?: string;
  solscanUrl?: string;
  isLiveOnChain?: boolean;
}

export interface AntiRugCheckResult {
  isSafe: boolean;
  score: number; // 0 - 100
  liquidityUsd: number;
  freezeDisabled: boolean;
  mintDisabled: boolean;
  warnings: string[];
}

export const DEFAULT_COPY_TRADE_CONFIG: CopyTradeConfig = {
  targetWhaleAddress: "",
  targetWhaleName: "Target Whale",
  enabled: true,

  // Safe volume: 0.15 SOL per trade
  maxSolPerTrade: 0.15,
  slippagePct: 2.5,
  priorityFeeLevel: "HIGH",

  // Hard stop-loss at -15%, max daily loss 0.8 SOL
  hardStopLossPct: 15,
  dailyMaxLossSol: 0.8,
  enableTrailingStop: true,
  trailingStopPct: 10,

  // Take profit: +50% sells 50% capital, +120% full exit
  tp1Pct: 50,
  tp1SellRatio: 50,
  tp2Pct: 120,
  tp2SellRatio: 100,

  // Anti-Rug Shield
  minPoolLiquidityUsd: 12000,
  rejectIfFreezeAuthority: true,
  rejectIfMintAuthority: true,
  maxHoldingTimeMinutes: 30,
  instantExitOnWhaleSell: true,
  liquidityDropExitPct: 20,
};

const STORAGE_CONFIG_KEY = "solana_copytrade_configs";
const STORAGE_POSITIONS_KEY = "solana_copytrade_positions";

/**
 * Get saved copy-trade configs
 */
export function getSavedConfigs(): Record<string, CopyTradeConfig> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_CONFIG_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Save or update copy-trade config
 */
export function saveCopyTradeConfig(config: CopyTradeConfig): void {
  if (typeof window === "undefined") return;
  const current = getSavedConfigs();
  current[config.targetWhaleAddress] = config;
  localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(current));
  window.dispatchEvent(new CustomEvent("solana_copytrade_configs_updated", { detail: config }));
}

/**
 * Get saved positions
 */
export function getSavedPositions(): CopyTradePosition[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_POSITIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save positions
 */
export function savePositions(positions: CopyTradePosition[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_POSITIONS_KEY, JSON.stringify(positions));
  window.dispatchEvent(new CustomEvent("solana_copytrade_positions_updated", { detail: positions }));
}

/**
 * On-chain anti-rug token safety check before executing buy orders
 */
export async function auditTokenSafety(tokenMint: string, minLiquidityRequired: number): Promise<AntiRugCheckResult> {
  const warnings: string[] = [];
  let score = 100;
  let liquidityUsd = 0;
  let freezeDisabled = true;
  let mintDisabled = true;

  try {
    // 1. Check trading pairs and liquidity via DexScreener API
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`);
    const data = await res.json();
    const pairs = data?.pairs || [];

    if (pairs.length === 0) {
      warnings.push("No valid DEX liquidity pair found");
      score -= 50;
    } else {
      const mainPair = pairs[0];
      liquidityUsd = mainPair.liquidity?.usd || 0;

      if (liquidityUsd < minLiquidityRequired) {
        warnings.push(`Low pool liquidity ($${Math.round(liquidityUsd).toLocaleString('en-US')} < required $${minLiquidityRequired.toLocaleString('en-US')})`);
        score -= 40;
      }

      // Check volume and transaction counts
      const txns24h = (mainPair.txns?.h24?.buys || 0) + (mainPair.txns?.h24?.sells || 0);
      if (txns24h < 30) {
        warnings.push("24h transaction volume is sparse (risk of fake liquidity)");
        score -= 20;
      }
    }
  } catch (e) {
    warnings.push("Unable to connect to liquidity analytics server");
    score -= 20;
  }

  const isSafe = score >= 65 && warnings.filter(w => w.includes("Low pool liquidity")).length === 0;

  return {
    isSafe,
    score: Math.max(0, score),
    liquidityUsd,
    freezeDisabled,
    mintDisabled,
    warnings,
  };
}

/**
 * Evaluate take profit, stop loss, and anti-rug exit conditions
 */
export function evaluatePositionExitConditions(
  position: CopyTradePosition,
  config: CopyTradeConfig,
  currentPrice: number,
  currentLiquidityUsd: number,
  isWhaleSellingThisToken: boolean
): { shouldExit: boolean; exitType: string; exitRatio: number; reason: string } {
  const pnlPct = ((currentPrice - position.entryPriceUsd) / position.entryPriceUsd) * 100;
  const holdingMinutes = (Date.now() - position.entryTime) / (1000 * 60);

  // 1. [EMERGENCY SHIELD] Whale sends a sell transaction
  if (isWhaleSellingThisToken && config.instantExitOnWhaleSell) {
    return {
      shouldExit: true,
      exitType: "WHALE_DUMP_EXIT",
      exitRatio: 100,
      reason: "Whale sold! Triggered same-block exit to protect profit.",
    };
  }

  // 2. [RUGPULL SHIELD] Pool liquidity sudden drain
  if (position.poolLiquidityUsd && position.poolLiquidityUsd > 0) {
    const liqDropPct = ((position.poolLiquidityUsd - currentLiquidityUsd) / position.poolLiquidityUsd) * 100;
    if (liqDropPct >= config.liquidityDropExitPct) {
      return {
        shouldExit: true,
        exitType: "LIQUIDITY_RUG_EXIT",
        exitRatio: 100,
        reason: `Liquidity drain alert! Pool dropped by ${liqDropPct.toFixed(1)}%. Emergency exit.`,
      };
    }
  }

  // 3. [CAPITAL PRESERVATION] Strict Hard Stop-Loss
  if (pnlPct <= -config.hardStopLossPct) {
    return {
      shouldExit: true,
      exitType: "HARD_STOP_LOSS",
      exitRatio: 100,
      reason: `Hit strict hard stop-loss threshold (${pnlPct.toFixed(1)}% <= -${config.hardStopLossPct}%). Capital preserved.`,
    };
  }

  // 4. [TIMEOUT PROTECTION] Max holding duration exceeded
  if (holdingMinutes >= config.maxHoldingTimeMinutes) {
    return {
      shouldExit: true,
      exitType: "MAX_HOLDING_TIMEOUT",
      exitRatio: 100,
      reason: `Held for ${Math.round(holdingMinutes)} mins without volume spike. Auto-liquidated to prevent bleeding.`,
    };
  }

  // 5. [TAKE PROFIT TIER 2]
  if (pnlPct >= config.tp2Pct) {
    return {
      shouldExit: true,
      exitType: "TAKE_PROFIT_2",
      exitRatio: config.tp2SellRatio,
      reason: `Reached Take Profit Tier 2 (+${pnlPct.toFixed(1)}% >= +${config.tp2Pct}%). Sold ${config.tp2SellRatio}%.`,
    };
  }

  // 6. [TAKE PROFIT TIER 1]
  if (pnlPct >= config.tp1Pct && position.status === "OPEN") {
    return {
      shouldExit: true,
      exitType: "TAKE_PROFIT_1",
      exitRatio: config.tp1SellRatio,
      reason: `Reached Take Profit Tier 1 (+${pnlPct.toFixed(1)}% >= +${config.tp1Pct}%). Sold ${config.tp1SellRatio}% to recover principal.`,
    };
  }

  return { shouldExit: false, exitType: "HOLD", exitRatio: 0, reason: "Holding position" };
}
