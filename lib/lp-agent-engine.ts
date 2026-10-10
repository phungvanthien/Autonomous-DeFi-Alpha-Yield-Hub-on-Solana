/**
 * Hệ thống Động cơ Multi-DEX LP Agent & Quản trị Rủi ro Thanh khoản
 * Hỗ trợ FluxBeam (Token-2022 Tax), Meteora DLMM, Raydium CLMM & Orca Whirlpools
 */

export type DexType = "METEORA_DLMM" | "FLUXBEAM" | "RAYDIUM_CLMM" | "ORCA_WHIRLPOOL";
export type StrategyType = "BLUECHIP_STABLE" | "VOLATILITY_HARVESTER" | "TAX_TOKEN_FARM";
export type PositionStatus = "IN_RANGE" | "OUT_OF_RANGE" | "REBALANCING" | "EMERGENCY_CLOSED";

export interface LpPoolData {
  id: string;
  dex: DexType;
  poolAddress: string;
  tokenA: { symbol: string; mint: string; decimals: number };
  tokenB: { symbol: string; mint: string; decimals: number };
  tvlUsd: number;
  volume24hUsd: number;
  feeApr24h: number;
  currentPrice: number; // Price of Token A in terms of Token B
  ilRiskScore: "LOW" | "MEDIUM" | "HIGH";
  isToken2022: boolean;
  transferFeePct?: number; // Dành riêng cho Token-2022 trên FluxBeam
  binStep?: number; // Meteora DLMM bin step
  feeTierPct: number;
}

export interface LpAgentConfig {
  poolAddress: string;
  dex: DexType;
  allocatedSol: number;
  strategyType: StrategyType;
  priceRangeLowerPct: number; // ví dụ: -10% so với giá hiện tại
  priceRangeUpperPct: number; // ví dụ: +10% so với giá hiện tại
  autoRebalance: boolean;
  autoCompound: boolean;
  minCompoundYieldSol: number; // ví dụ: 0.05 SOL
  emergencyStopLossPct: number; // Cắt lỗ rút sạch thanh khoản nếu giá tụt quá -15%
}

export interface ActiveLpPosition {
  id: string;
  poolAddress: string;
  dex: DexType;
  tokenPair: string;
  depositAmountSol: number;
  currentValueUsd: number;
  earnedFeesSol: number;
  status: PositionStatus;
  entryTime: number;
  currentApr: number;
  entryPrice: number;
  currentPrice: number;
  lowerPrice: number;
  upperPrice: number;
  strategyType: StrategyType;
  autoRebalance: boolean;
  autoCompound: boolean;
  unclaimedFeesSol: number;
  impermanentLossPct: number;
}

export interface IlSimulationResult {
  priceChangePct: number;
  newPrice: number;
  standardIlPct: number; // IL theo AMM chuẩn xy=k
  concentratedIlPct: number; // IL theo Concentrated / DLMM
  netYieldSol: number; // Lãi ròng sau khi bù trừ Fee và IL
  isOutOfRange: boolean;
  tokenARatioPct: number; // Tỷ lệ token A còn lại trong vị thế
  tokenBRatioPct: number; // Tỷ lệ token B còn lại trong vị thế
}

export const STRATEGY_PRESETS: Record<StrategyType, {
  name: string;
  description: string;
  recommendedRangePct: [number, number];
  defaultStopLossPct: number;
  minCompoundYieldSol: number;
  autoRebalance: boolean;
}> = {
  BLUECHIP_STABLE: {
    name: "Bluechip Stable Yield",
    description: "Wide price band (±15%), minimal Impermanent Loss risk, reliable steady fee generation for SOL/USDC and bluechips.",
    recommendedRangePct: [-15, 15],
    defaultStopLossPct: 15,
    minCompoundYieldSol: 0.05,
    autoRebalance: true,
  },
  VOLATILITY_HARVESTER: {
    name: "Dynamic Volatility (DLMM)",
    description: "Narrow active band (±5%), concentrated bin liquidity, capturing explosive dynamic fees during high meme volatility.",
    recommendedRangePct: [-5, 5],
    defaultStopLossPct: 12,
    minCompoundYieldSol: 0.03,
    autoRebalance: true,
  },
  TAX_TOKEN_FARM: {
    name: "FluxBeam Tax Token Harvester",
    description: "Provide concentrated liquidity for SPL Token-2022 pairs with transfer taxes, earning direct volume tax dividends.",
    recommendedRangePct: [-20, 20],
    defaultStopLossPct: 18,
    minCompoundYieldSol: 0.02,
    autoRebalance: false,
  },
};

export const MOCK_LP_POOLS: LpPoolData[] = [
  {
    id: "pool_meteora_sol_usdc",
    dex: "METEORA_DLMM",
    poolAddress: "ARwi1S4DaiTG5DX7S4M4ZsrXqpMD1MrTmbu9ue2tpmEq",
    tokenA: { symbol: "SOL", mint: "So11111111111111111111111111111111111111112", decimals: 9 },
    tokenB: { symbol: "USDC", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6 },
    tvlUsd: 14250000,
    volume24hUsd: 28400000,
    feeApr24h: 42.8,
    currentPrice: 152.4,
    ilRiskScore: "LOW",
    isToken2022: false,
    binStep: 20,
    feeTierPct: 0.15,
  },
  {
    id: "pool_meteora_wif_sol",
    dex: "METEORA_DLMM",
    poolAddress: "EP2ib6dYdEeqD8MfE2ezHCxX39AzhRMA4vdNnLMRURNq",
    tokenA: { symbol: "WIF", mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", decimals: 6 },
    tokenB: { symbol: "SOL", mint: "So11111111111111111111111111111111111111112", decimals: 9 },
    tvlUsd: 5820000,
    volume24hUsd: 19400000,
    feeApr24h: 312.5,
    currentPrice: 0.0158,
    ilRiskScore: "HIGH",
    isToken2022: false,
    binStep: 100,
    feeTierPct: 0.85,
  },
  {
    id: "pool_meteora_bonk_sol",
    dex: "METEORA_DLMM",
    poolAddress: "6bV9C4qg5qL6V6bTz7uN2aP3wE8mK4yR1tY5uI7oP9s",
    tokenA: { symbol: "BONK", mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", decimals: 5 },
    tokenB: { symbol: "SOL", mint: "So11111111111111111111111111111111111111112", decimals: 9 },
    tvlUsd: 7150000,
    volume24hUsd: 16800000,
    feeApr24h: 188.4,
    currentPrice: 0.00000014,
    ilRiskScore: "MEDIUM",
    isToken2022: false,
    binStep: 80,
    feeTierPct: 0.5,
  },
  {
    id: "pool_meteora_popcat_sol",
    dex: "METEORA_DLMM",
    poolAddress: "3kF8mN2vP5qR9wA1tZ4yU7iO2sD4fG6hJ8kL1mN3nQ5",
    tokenA: { symbol: "POPCAT", mint: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr", decimals: 9 },
    tokenB: { symbol: "SOL", mint: "So11111111111111111111111111111111111111112", decimals: 9 },
    tvlUsd: 4620000,
    volume24hUsd: 12500000,
    feeApr24h: 275.0,
    currentPrice: 0.0084,
    ilRiskScore: "HIGH",
    isToken2022: false,
    binStep: 90,
    feeTierPct: 0.65,
  },
  {
    id: "pool_fluxbeam_flx_sol",
    dex: "FLUXBEAM",
    poolAddress: "5m9j2f4zXm3J4mX9wA1qG8kZ5R7vT2pY4uB6nK8mP1eQ",
    tokenA: { symbol: "FLX", mint: "FLX3333333333333333333333333333333333333333", decimals: 6 },
    tokenB: { symbol: "SOL", mint: "So11111111111111111111111111111111111111112", decimals: 9 },
    tvlUsd: 890000,
    volume24hUsd: 1750000,
    feeApr24h: 185.4,
    currentPrice: 0.0042,
    ilRiskScore: "MEDIUM",
    isToken2022: true,
    transferFeePct: 2.5,
    feeTierPct: 0.5,
  },
  {
    id: "pool_fluxbeam_bern_sol",
    dex: "FLUXBEAM",
    poolAddress: "8kL3pX7vB2mN5qR1wA4tZ9yU6iO2sD4fG7hJ1kM3nQ5w",
    tokenA: { symbol: "BERN", mint: "CKfatsbvYHgSCBtENHgEbG3tdnvEK73TC2Lmr28SCD4P", decimals: 5 },
    tokenB: { symbol: "SOL", mint: "So11111111111111111111111111111111111111112", decimals: 9 },
    tvlUsd: 420000,
    volume24hUsd: 980000,
    feeApr24h: 245.0,
    currentPrice: 0.000085,
    ilRiskScore: "HIGH",
    isToken2022: true,
    transferFeePct: 3.0,
    feeTierPct: 0.75,
  },
  {
    id: "pool_fluxbeam_chat_sol",
    dex: "FLUXBEAM",
    poolAddress: "7nQ2wA9vB4mK6pR8yU1tZ3iO5sD7fG9hJ2kL4mN6pQ8",
    tokenA: { symbol: "CHAT", mint: "CHAT2222222222222222222222222222222222222222", decimals: 6 },
    tokenB: { symbol: "SOL", mint: "So11111111111111111111111111111111111111112", decimals: 9 },
    tvlUsd: 310000,
    volume24hUsd: 650000,
    feeApr24h: 165.0,
    currentPrice: 0.00012,
    ilRiskScore: "MEDIUM",
    isToken2022: true,
    transferFeePct: 4.0,
    feeTierPct: 0.6,
  },
  {
    id: "pool_fluxbeam_pepe22_sol",
    dex: "FLUXBEAM",
    poolAddress: "2pY4uB6nK8mP1eQ5m9j2f4zXm3J4mX9wA1qG8kZ5R7v",
    tokenA: { symbol: "PEPE22", mint: "PEPE2222222222222222222222222222222222222222", decimals: 6 },
    tokenB: { symbol: "SOL", mint: "So11111111111111111111111111111111111111112", decimals: 9 },
    tvlUsd: 240000,
    volume24hUsd: 890000,
    feeApr24h: 380.0,
    currentPrice: 0.0000035,
    ilRiskScore: "HIGH",
    isToken2022: true,
    transferFeePct: 5.0,
    feeTierPct: 1.0,
  },
  {
    id: "pool_raydium_jup_sol",
    dex: "RAYDIUM_CLMM",
    poolAddress: "2QdSbZhYt11guTxtzWKG44Wh82UpdU64AJbGuAY1hK4o",
    tokenA: { symbol: "JUP", mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", decimals: 6 },
    tokenB: { symbol: "SOL", mint: "So11111111111111111111111111111111111111112", decimals: 9 },
    tvlUsd: 8750000,
    volume24hUsd: 14200000,
    feeApr24h: 68.2,
    currentPrice: 0.0068,
    ilRiskScore: "LOW",
    isToken2022: false,
    feeTierPct: 0.25,
  },
  {
    id: "pool_raydium_ray_sol",
    dex: "RAYDIUM_CLMM",
    poolAddress: "8sLbNZoA1cfnvMJLPfp98nS8ETv8UMUYYfyYF7hGWt16",
    tokenA: { symbol: "RAY", mint: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", decimals: 6 },
    tokenB: { symbol: "SOL", mint: "So11111111111111111111111111111111111111112", decimals: 9 },
    tvlUsd: 12300000,
    volume24hUsd: 22100000,
    feeApr24h: 84.5,
    currentPrice: 0.0132,
    ilRiskScore: "LOW",
    isToken2022: false,
    feeTierPct: 0.25,
  },
  {
    id: "pool_raydium_pyth_sol",
    dex: "RAYDIUM_CLMM",
    poolAddress: "4V8vK6uB1qG8kZ5R7vT2pY4uB6nK8mP1eQ5m9j2f4zXm",
    tokenA: { symbol: "PYTH", mint: "HZ1JovNiRvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3", decimals: 6 },
    tokenB: { symbol: "SOL", mint: "So11111111111111111111111111111111111111112", decimals: 9 },
    tvlUsd: 6900000,
    volume24hUsd: 9400000,
    feeApr24h: 49.3,
    currentPrice: 0.0028,
    ilRiskScore: "LOW",
    isToken2022: false,
    feeTierPct: 0.2,
  },
  {
    id: "pool_raydium_render_sol",
    dex: "RAYDIUM_CLMM",
    poolAddress: "6hP1eQ5m9j2f4zXm3J4mX9wA1qG8kZ5R7vT2pY4uB6nK",
    tokenA: { symbol: "RENDER", mint: "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof", decimals: 8 },
    tokenB: { symbol: "SOL", mint: "So11111111111111111111111111111111111111112", decimals: 9 },
    tvlUsd: 5400000,
    volume24hUsd: 8200000,
    feeApr24h: 58.7,
    currentPrice: 0.038,
    ilRiskScore: "MEDIUM",
    isToken2022: false,
    feeTierPct: 0.3,
  },
  {
    id: "pool_orca_sol_usdt",
    dex: "ORCA_WHIRLPOOL",
    poolAddress: "FpCMFDFGYotvufJ7HrFHqWEiiQCGbk4r768bH46P7h8P",
    tokenA: { symbol: "SOL", mint: "So11111111111111111111111111111111111111112", decimals: 9 },
    tokenB: { symbol: "USDT", mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", decimals: 6 },
    tvlUsd: 19800000,
    volume24hUsd: 31200000,
    feeApr24h: 38.6,
    currentPrice: 152.2,
    ilRiskScore: "LOW",
    isToken2022: false,
    feeTierPct: 0.12,
  },
  {
    id: "pool_orca_jitosol_sol",
    dex: "ORCA_WHIRLPOOL",
    poolAddress: "8qW5tZ2pY4uB6nK8mP1eQ5m9j2f4zXm3J4mX9wA1qG8k",
    tokenA: { symbol: "JitoSOL", mint: "J1toso1uCk3RKmKKpHujJWuAbqCkWvjKX29sZxqack5N", decimals: 9 },
    tokenB: { symbol: "SOL", mint: "So11111111111111111111111111111111111111112", decimals: 9 },
    tvlUsd: 35200000,
    volume24hUsd: 14800000,
    feeApr24h: 14.8,
    currentPrice: 1.12,
    ilRiskScore: "LOW",
    isToken2022: false,
    feeTierPct: 0.04,
  },
  {
    id: "pool_orca_bsol_sol",
    dex: "ORCA_WHIRLPOOL",
    poolAddress: "9sD4fG7hJ1kM3nQ5w8kL3pX7vB2mN5qR1wA4tZ9yU6iO",
    tokenA: { symbol: "bSOL", mint: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1", decimals: 9 },
    tokenB: { symbol: "SOL", mint: "So11111111111111111111111111111111111111112", decimals: 9 },
    tvlUsd: 24500000,
    volume24hUsd: 9800000,
    feeApr24h: 12.4,
    currentPrice: 1.18,
    ilRiskScore: "LOW",
    isToken2022: false,
    feeTierPct: 0.04,
  },
  {
    id: "pool_orca_mew_sol",
    dex: "ORCA_WHIRLPOOL",
    poolAddress: "5rT2pY4uB6nK8mP1eQ5m9j2f4zXm3J4mX9wA1qG8kZ5R",
    tokenA: { symbol: "MEW", mint: "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5", decimals: 5 },
    tokenB: { symbol: "SOL", mint: "So11111111111111111111111111111111111111112", decimals: 9 },
    tvlUsd: 3800000,
    volume24hUsd: 9100000,
    feeApr24h: 220.0,
    currentPrice: 0.000062,
    ilRiskScore: "HIGH",
    isToken2022: false,
    feeTierPct: 0.65,
  },
];

const STORAGE_LP_POSITIONS_KEY = "solana_lp_agent_positions";
const STORAGE_LP_CONFIGS_KEY = "solana_lp_agent_configs";

/**
 * Tính toán Impermanent Loss cho AMM thông thường
 * Formula: IL = 2 * sqrt(k) / (1 + k) - 1 với k = newPrice / initialPrice
 */
export function calculateStandardIL(priceChangePct: number): number {
  const k = 1 + priceChangePct / 100;
  if (k <= 0) return -100;
  const ilFraction = (2 * Math.sqrt(k)) / (1 + k) - 1;
  return Number((ilFraction * 100).toFixed(2));
}

/**
 * Tính toán Impermanent Loss cho Concentrated Liquidity (DLMM/CLMM)
 * Khi ở trong dải hẹp, IL bị phóng đại theo tỷ lệ đòn bẩy thanh khoản
 */
export function simulateConcentratedIL(
  initialPrice: number,
  newPrice: number,
  lowerPrice: number,
  upperPrice: number,
  feeAprPct: number,
  daysHolding: number = 7,
  depositSol: number = 1.0
): IlSimulationResult {
  const priceChangePct = ((newPrice - initialPrice) / initialPrice) * 100;
  const standardIlPct = calculateStandardIL(priceChangePct);

  const isOutOfRange = newPrice < lowerPrice || newPrice > upperPrice;

  // Độ tập trung thanh khoản (Liquidity Concentration Factor)
  const rangeSpanPct = Math.max(1, ((upperPrice - lowerPrice) / initialPrice) * 100);
  const concentrationFactor = Math.min(20, Math.max(1, 100 / rangeSpanPct));

  let concentratedIlPct = 0;
  let tokenARatioPct = 50;
  let tokenBRatioPct = 50;

  if (newPrice <= lowerPrice) {
    // Giá rớt thủng đáy: Toàn bộ vị thế bị trượt thành Token A 100%
    tokenARatioPct = 100;
    tokenBRatioPct = 0;
    concentratedIlPct = standardIlPct * Math.min(concentrationFactor, 2.5);
  } else if (newPrice >= upperPrice) {
    // Giá vượt đỉnh: Toàn bộ vị thế chốt lời thành Token B 100%
    tokenARatioPct = 0;
    tokenBRatioPct = 100;
    concentratedIlPct = standardIlPct * Math.min(concentrationFactor, 2.5);
  } else {
    // Vị thế nằm trong dải
    const positionInRange = (newPrice - lowerPrice) / (upperPrice - lowerPrice);
    tokenBRatioPct = Number((positionInRange * 100).toFixed(1));
    tokenARatioPct = 100 - tokenBRatioPct;
    concentratedIlPct = standardIlPct * (concentrationFactor * 0.6);
  }

  // Lợi nhuận phí dự phóng
  const dailyFeeRate = (feeAprPct / 365) / 100;
  const effectiveFeeMultiplier = isOutOfRange ? 0.3 : 1.0;
  const feeEarnedSol = depositSol * dailyFeeRate * daysHolding * effectiveFeeMultiplier;

  // Lỗ tạm thời tính bằng SOL
  const ilLossSol = depositSol * (Math.abs(concentratedIlPct) / 100);
  const netYieldSol = feeEarnedSol - ilLossSol;

  return {
    priceChangePct: Number(priceChangePct.toFixed(2)),
    newPrice,
    standardIlPct,
    concentratedIlPct: Number(concentratedIlPct.toFixed(2)),
    netYieldSol: Number(netYieldSol.toFixed(4)),
    isOutOfRange,
    tokenARatioPct,
    tokenBRatioPct,
  };
}

/**
 * Đọc danh sách vị thế LP đã lưu
 */
export function getSavedLpPositions(): ActiveLpPosition[] {
  if (typeof window === "undefined") return getInitialMockLpPositions();
  try {
    const raw = localStorage.getItem(STORAGE_LP_POSITIONS_KEY);
    if (!raw) {
      const initial = getInitialMockLpPositions();
      localStorage.setItem(STORAGE_LP_POSITIONS_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return getInitialMockLpPositions();
  }
}

/**
 * Lưu danh sách vị thế LP
 */
export function saveLpPositions(positions: ActiveLpPosition[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_LP_POSITIONS_KEY, JSON.stringify(positions));
  } catch (err) {
    console.error("Failed to save LP positions to localStorage", err);
  }
}

/**
 * Tạo dữ liệu mẫu ban đầu cho LP Positions
 */
export function getInitialMockLpPositions(): ActiveLpPosition[] {
  const baseTime = typeof window !== "undefined" ? Date.now() : 1718000000000;
  return [
    {
      id: "lp_pos_1",
      poolAddress: "ARwi1S4DaiTG5DX7S4M4ZsrXqpMD1MrTmbu9ue2tpmEq",
      dex: "METEORA_DLMM",
      tokenPair: "SOL-USDC",
      depositAmountSol: 2.5,
      currentValueUsd: 388.5,
      earnedFeesSol: 0.084,
      status: "IN_RANGE",
      entryTime: baseTime - 3 * 24 * 3600 * 1000,
      currentApr: 45.2,
      entryPrice: 148.5,
      currentPrice: 152.4,
      lowerPrice: 135.0,
      upperPrice: 165.0,
      strategyType: "BLUECHIP_STABLE",
      autoRebalance: true,
      autoCompound: true,
      unclaimedFeesSol: 0.038,
      impermanentLossPct: -0.42,
    },
    {
      id: "lp_pos_2",
      poolAddress: "EP2ib6dYdEeqD8MfE2ezHCxX39AzhRMA4vdNnLMRURNq",
      dex: "METEORA_DLMM",
      tokenPair: "WIF-SOL",
      depositAmountSol: 1.2,
      currentValueUsd: 195.2,
      earnedFeesSol: 0.145,
      status: "IN_RANGE",
      entryTime: baseTime - 1 * 24 * 3600 * 1000,
      currentApr: 320.0,
      entryPrice: 0.0152,
      currentPrice: 0.0158,
      lowerPrice: 0.0142,
      upperPrice: 0.0168,
      strategyType: "VOLATILITY_HARVESTER",
      autoRebalance: true,
      autoCompound: true,
      unclaimedFeesSol: 0.072,
      impermanentLossPct: -1.85,
    },
    {
      id: "lp_pos_3",
      poolAddress: "5m9j2f4zXm3J4mX9wA1qG8kZ5R7vT2pY4uB6nK8mP1eQ",
      dex: "FLUXBEAM",
      tokenPair: "FLX-SOL (Token-2022)",
      depositAmountSol: 0.8,
      currentValueUsd: 124.0,
      earnedFeesSol: 0.065,
      status: "IN_RANGE",
      entryTime: baseTime - 2 * 24 * 3600 * 1000,
      currentApr: 185.4,
      entryPrice: 0.0040,
      currentPrice: 0.0042,
      lowerPrice: 0.0032,
      upperPrice: 0.0050,
      strategyType: "TAX_TOKEN_FARM",
      autoRebalance: false,
      autoCompound: true,
      unclaimedFeesSol: 0.029,
      impermanentLossPct: -0.88,
    },
  ];
}

/**
 * Tạo vị thế LP mới
 */
export function deployLpPosition(
  pool: LpPoolData,
  config: LpAgentConfig,
  currentSolPriceUsd: number = 185.0
): ActiveLpPosition {
  const lowerPrice = pool.currentPrice * (1 + config.priceRangeLowerPct / 100);
  const upperPrice = pool.currentPrice * (1 + config.priceRangeUpperPct / 100);

  const newPosition: ActiveLpPosition = {
    id: `lp_pos_${Date.now()}`,
    poolAddress: pool.poolAddress,
    dex: pool.dex,
    tokenPair: `${pool.tokenA.symbol}-${pool.tokenB.symbol}`,
    depositAmountSol: config.allocatedSol,
    currentValueUsd: config.allocatedSol * currentSolPriceUsd,
    earnedFeesSol: 0,
    status: "IN_RANGE",
    entryTime: Date.now(),
    currentApr: pool.feeApr24h,
    entryPrice: pool.currentPrice,
    currentPrice: pool.currentPrice,
    lowerPrice: Number(lowerPrice.toFixed(6)),
    upperPrice: Number(upperPrice.toFixed(6)),
    strategyType: config.strategyType,
    autoRebalance: config.autoRebalance,
    autoCompound: config.autoCompound,
    unclaimedFeesSol: 0,
    impermanentLossPct: 0,
  };

  const existing = getSavedLpPositions();
  saveLpPositions([newPosition, ...existing]);
  return newPosition;
}

/**
 * Thu gom phí (Harvest Fees)
 */
export function harvestLpFees(positionId: string): { harvestedSol: number; success: boolean } {
  const positions = getSavedLpPositions();
  const posIndex = positions.findIndex((p) => p.id === positionId);
  if (posIndex === -1) return { harvestedSol: 0, success: false };

  const pos = positions[posIndex];
  const harvested = pos.unclaimedFeesSol;
  pos.earnedFeesSol += harvested;
  pos.unclaimedFeesSol = 0;

  positions[posIndex] = pos;
  saveLpPositions(positions);
  return { harvestedSol: harvested, success: true };
}

/**
 * Tái cân bằng dải giá (Rebalance Position)
 */
export function rebalanceLpPosition(
  positionId: string,
  newRangePct: [number, number] = [-10, 10]
): { success: boolean; position?: ActiveLpPosition } {
  const positions = getSavedLpPositions();
  const posIndex = positions.findIndex((p) => p.id === positionId);
  if (posIndex === -1) return { success: false };

  const pos = positions[posIndex];
  pos.lowerPrice = Number((pos.currentPrice * (1 + newRangePct[0] / 100)).toFixed(6));
  pos.upperPrice = Number((pos.currentPrice * (1 + newRangePct[1] / 100)).toFixed(6));
  pos.status = "IN_RANGE";

  positions[posIndex] = pos;
  saveLpPositions(positions);
  return { success: true, position: pos };
}

/**
 * Thoát khẩn cấp (Emergency Unstake / Exit)
 */
export function emergencyExitLpPosition(positionId: string): { success: boolean } {
  const positions = getSavedLpPositions();
  const posIndex = positions.findIndex((p) => p.id === positionId);
  if (posIndex === -1) return { success: false };

  positions[posIndex].status = "EMERGENCY_CLOSED";
  saveLpPositions(positions);
  return { success: true };
}
