"use client";

import { useState, useEffect } from "react";
import {
  LpPoolData,
  LpAgentConfig,
  StrategyType,
  STRATEGY_PRESETS,
  simulateConcentratedIL,
} from "@/lib/lp-agent-engine";
import {
  X,
  Zap,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  DollarSign,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Lock,
  Coins,
} from "lucide-react";

interface DeployLpModalProps {
  pool: LpPoolData | null;
  isOpen: boolean;
  onClose: () => void;
  subWalletBalance: number;
  onDeploy: (pool: LpPoolData, config: LpAgentConfig) => void;
  onOpenDepositModal?: (amount: number) => void;
}

export function DeployLpModal({
  pool,
  isOpen,
  onClose,
  subWalletBalance,
  onDeploy,
  onOpenDepositModal,
}: DeployLpModalProps) {
  if (!isOpen || !pool) return null;

  const [allocatedSol, setAllocatedSol] = useState<number>(0.5);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>("VOLATILITY_HARVESTER");
  const [priceLowerPct, setPriceLowerPct] = useState<number>(-10);
  const [priceUpperPct, setPriceUpperPct] = useState<number>(10);
  const [autoRebalance, setAutoRebalance] = useState(true);
  const [autoCompound, setAutoCompound] = useState(true);
  const [minCompoundYieldSol, setMinCompoundYieldSol] = useState<number>(0.05);
  const [emergencyStopLossPct, setEmergencyStopLossPct] = useState(15);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Khởi tạo thiết lập ban đầu thông minh theo từng pool
  useEffect(() => {
    if (pool.isToken2022) {
      setSelectedStrategy("TAX_TOKEN_FARM");
      const preset = STRATEGY_PRESETS["TAX_TOKEN_FARM"];
      setPriceLowerPct(preset.recommendedRangePct[0]);
      setPriceUpperPct(preset.recommendedRangePct[1]);
      setAutoRebalance(preset.autoRebalance);
      setEmergencyStopLossPct(preset.defaultStopLossPct);
      setMinCompoundYieldSol(preset.minCompoundYieldSol);
    } else if (pool.dex === "METEORA_DLMM") {
      setSelectedStrategy("VOLATILITY_HARVESTER");
      const preset = STRATEGY_PRESETS["VOLATILITY_HARVESTER"];
      setPriceLowerPct(preset.recommendedRangePct[0]);
      setPriceUpperPct(preset.recommendedRangePct[1]);
      setAutoRebalance(preset.autoRebalance);
      setEmergencyStopLossPct(preset.defaultStopLossPct);
      setMinCompoundYieldSol(preset.minCompoundYieldSol);
    } else {
      setSelectedStrategy("BLUECHIP_STABLE");
      const preset = STRATEGY_PRESETS["BLUECHIP_STABLE"];
      setPriceLowerPct(preset.recommendedRangePct[0]);
      setPriceUpperPct(preset.recommendedRangePct[1]);
      setAutoRebalance(preset.autoRebalance);
      setEmergencyStopLossPct(preset.defaultStopLossPct);
      setMinCompoundYieldSol(preset.minCompoundYieldSol);
    }
  }, [pool]);

  const handleSelectStrategy = (st: StrategyType) => {
    setSelectedStrategy(st);
    const preset = STRATEGY_PRESETS[st];
    setPriceLowerPct(preset.recommendedRangePct[0]);
    setPriceUpperPct(preset.recommendedRangePct[1]);
    setAutoRebalance(preset.autoRebalance);
    setEmergencyStopLossPct(preset.defaultStopLossPct);
    setMinCompoundYieldSol(preset.minCompoundYieldSol);
  };

  const handleConfirmDeploy = () => {
    setErrorMsg(null);
    if (allocatedSol <= 0) {
      setErrorMsg("Please enter an allocated SOL amount greater than 0");
      return;
    }
    if (allocatedSol > subWalletBalance) {
      if (onOpenDepositModal) {
        const wantDeposit = confirm(
          `Sub-Wallet balance (${subWalletBalance.toFixed(3)} SOL) is insufficient to fund ${allocatedSol} SOL.\nWould you like to deposit more SOL into Sub-Wallet now?`
        );
        if (wantDeposit) {
          onOpenDepositModal(Number((allocatedSol - subWalletBalance + 0.1).toFixed(2)));
          return;
        }
      }
      setErrorMsg(`Sub-Wallet balance (${subWalletBalance.toFixed(3)} SOL) is insufficient to fund ${allocatedSol} SOL. Please deposit more.`);
      return;
    }

    const config: LpAgentConfig = {
      poolAddress: pool.poolAddress,
      dex: pool.dex,
      allocatedSol,
      strategyType: selectedStrategy,
      priceRangeLowerPct: priceLowerPct,
      priceRangeUpperPct: priceUpperPct,
      autoRebalance,
      autoCompound,
      minCompoundYieldSol,
      emergencyStopLossPct,
    };

    onDeploy(pool, config);
    onClose();
  };

  const lowerBoundPrice = pool.currentPrice * (1 + priceLowerPct / 100);
  const upperBoundPrice = pool.currentPrice * (1 + priceUpperPct / 100);
  const dailyFeeEstSol = (allocatedSol * (pool.feeApr24h / 365) / 100);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="size-5" />
        </button>

        {/* Modal Header */}
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[11px] font-mono font-bold">
              {pool.dex.replace("_", " ")}
            </span>
            {pool.isToken2022 && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-mono font-bold">
                Token-2022 ({pool.transferFeePct}% Tax)
              </span>
            )}
          </div>
          <h2 className="text-xl font-black text-white">
            Deploy LP Agent: {pool.tokenA.symbol}/{pool.tokenB.symbol}
          </h2>
          <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
            <span>
              Fee APR: <strong className="text-emerald-400 font-mono">+{pool.feeApr24h}%</strong>
            </span>
            <span>•</span>
            <span>
              TVL: <strong className="text-zinc-200 font-mono">${(pool.tvlUsd / 1000000).toFixed(2)}M</strong>
            </span>
            <span>•</span>
            <span>
              Current Price: <strong className="text-white font-mono">${pool.currentPrice}</strong>
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="size-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-4 text-xs">
          {/* 1. Capital Allocation */}
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-2">
            <div className="flex justify-between items-center flex-wrap gap-1">
              <span className="font-semibold text-zinc-200">Allocated Capital (SOL):</span>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 font-mono text-[11px]">
                  Sub-Wallet: <strong className="text-purple-300">{subWalletBalance.toFixed(3)} SOL</strong>
                </span>
                {onOpenDepositModal && (
                  <button
                    type="button"
                    onClick={() => onOpenDepositModal(allocatedSol)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    <Coins className="size-2.5" />
                    <span>+ Nạp SOL</span>
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.05"
                min="0.05"
                value={allocatedSol}
                onChange={(e) => setAllocatedSol(parseFloat(e.target.value) || 0)}
                className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono text-sm focus:outline-none focus:border-purple-500"
              />
              <div className="flex items-center gap-1">
                {[0.2, 0.5, 1.0].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAllocatedSol(amt)}
                    className="px-2.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono transition-colors cursor-pointer"
                  >
                    {amt} SOL
                  </button>
                ))}
                {subWalletBalance > 0 && (
                  <button
                    type="button"
                    onClick={() => setAllocatedSol(Number(Math.max(0.05, subWalletBalance - 0.01).toFixed(2)))}
                    className="px-2.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-mono font-bold transition-colors cursor-pointer"
                  >
                    MAX
                  </button>
                )}
              </div>
            </div>
            <div className="flex justify-between text-[11px] text-zinc-400 pt-1">
              <span>Estimated Daily Harvest:</span>
              <span className="font-mono text-emerald-400 font-bold">~+{dailyFeeEstSol.toFixed(4)} SOL/day</span>
            </div>
          </div>

          {/* 2. Strategy Presets */}
          <div className="space-y-2">
            <label className="font-semibold text-zinc-200 block">Select Strategy Preset:</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(["BLUECHIP_STABLE", "VOLATILITY_HARVESTER", "TAX_TOKEN_FARM"] as StrategyType[]).map((st) => {
                const s = STRATEGY_PRESETS[st];
                const isSelected = selectedStrategy === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleSelectStrategy(st)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-purple-500/10 border-purple-500/50 shadow-md shadow-purple-500/10"
                        : "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-bold text-[11px] ${isSelected ? "text-purple-300" : "text-white"}`}>
                        {st === "BLUECHIP_STABLE"
                          ? "Bluechip Stable"
                          : st === "VOLATILITY_HARVESTER"
                          ? "Meteora DLMM"
                          : "Flux Tax Farm"}
                      </span>
                      {isSelected && <CheckCircle2 className="size-3.5 text-purple-400" />}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-1 leading-snug">
                      Range: {s.recommendedRangePct[0]}% to +{s.recommendedRangePct[1]}%
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Price Range Bounds */}
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-zinc-200">Price Range:</span>
              <span className="font-mono text-amber-300 font-bold">
                {priceLowerPct}% to +{priceUpperPct}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 block">
                  Lower Bound (Min -{Math.abs(priceLowerPct)}%):
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={priceLowerPct}
                    onChange={(e) => setPriceLowerPct(parseFloat(e.target.value) || -10)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
                  />
                  <span className="text-[10px] text-zinc-500">%</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono block">
                  ${lowerBoundPrice.toFixed(6)}
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 block">
                  Upper Bound (Max +{priceUpperPct}%):
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={priceUpperPct}
                    onChange={(e) => setPriceUpperPct(parseFloat(e.target.value) || 10)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
                  />
                  <span className="text-[10px] text-zinc-500">%</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono block">
                  ${upperBoundPrice.toFixed(6)}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Autonomous Controls & Guard */}
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-3">
            <span className="font-semibold text-zinc-200 block">Autonomous Sentinel Controls:</span>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRebalance}
                onChange={(e) => setAutoRebalance(e.target.checked)}
                className="mt-0.5 rounded bg-zinc-900 border-zinc-700 text-purple-500 cursor-pointer"
              />
              <div>
                <span className="text-white font-medium">Auto-Rebalance when Out of Range</span>
                <p className="text-[10px] text-zinc-400">
                  Sub-Wallet withdraws LP, rebalances 50:50 and deploys a fresh active band when price diverges.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoCompound}
                onChange={(e) => setAutoCompound(e.target.checked)}
                className="mt-0.5 rounded bg-zinc-900 border-zinc-700 text-purple-500 cursor-pointer"
              />
              <div>
                <span className="text-white font-medium">Auto-Compound Yield</span>
                <p className="text-[10px] text-zinc-400">
                  Automatically claims and re-deposits trading fees once accrued fees exceed {minCompoundYieldSol} SOL.
                </p>
              </div>
            </label>

            {/* Emergency Panic Exit threshold */}
            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
              <div>
                <span className="text-red-400 font-medium">Emergency Dump Guard (Stop-Loss):</span>
                <p className="text-[10px] text-zinc-400">
                  Instant liquidity unwind and market swap to SOL if pool token crashes beyond limit.
                </p>
              </div>
              <div className="flex items-center gap-1 font-mono text-red-400 font-bold">
                <span>-{emergencyStopLossPct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
            <Lock className="size-3 text-emerald-400" />
            <span>Zero-Popup Signing via Sub-Wallet Vault</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDeploy}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-emerald-500 hover:from-purple-400 hover:to-emerald-400 text-black font-extrabold text-xs shadow-lg shadow-purple-500/25 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Zap className="size-3.5 fill-current" />
              <span>Deploy LP Agent 1-Click</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
