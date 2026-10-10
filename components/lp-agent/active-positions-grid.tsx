"use client";

import { useState } from "react";
import { ActiveLpPosition } from "@/lib/lp-agent-engine";
import {
  Coins,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Sliders,
  DollarSign,
  ArrowUpRight,
  Sparkles,
  X,
  Lock,
} from "lucide-react";

interface ActivePositionsGridProps {
  positions: ActiveLpPosition[];
  onHarvest: (positionId: string) => void;
  onRebalance: (positionId: string, newRange: [number, number]) => void;
  onEmergencyExit: (positionId: string) => void;
  onExplorePools: () => void;
}

export function ActivePositionsGrid({
  positions,
  onHarvest,
  onRebalance,
  onEmergencyExit,
  onExplorePools,
}: ActivePositionsGridProps) {
  const [rebalancingPos, setRebalancingPos] = useState<ActiveLpPosition | null>(null);
  const [customRangeMin, setCustomRangeMin] = useState<number>(-10);
  const [customRangeMax, setCustomRangeMax] = useState<number>(10);

  const handleOpenRebalanceModal = (pos: ActiveLpPosition) => {
    setRebalancingPos(pos);
    setCustomRangeMin(-8);
    setCustomRangeMax(8);
  };

  const handleConfirmRebalance = () => {
    if (!rebalancingPos) return;
    onRebalance(rebalancingPos.id, [customRangeMin, customRangeMax]);
    setRebalancingPos(null);
  };

  if (positions.length === 0) {
    return (
      <div className="p-12 text-center rounded-3xl bg-zinc-900/40 border border-zinc-800 space-y-4">
        <div className="size-14 mx-auto rounded-2xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-zinc-500">
          <Coins className="size-7 text-purple-400" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-white text-base">No Active LP Positions Found</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            The autonomous LP Agent sentinel is ready. Discover pools and deploy your first automated liquidity position on Meteora DLMM or FluxBeam.
          </p>
        </div>
        <button
          onClick={onExplorePools}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-emerald-500 hover:from-purple-400 hover:to-emerald-400 text-black font-extrabold text-xs shadow-lg transition-all cursor-pointer font-sans"
        >
          Explore Liquidity Pools
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {positions.map((pos) => {
          const isOutOfRange = pos.status === "OUT_OF_RANGE";
          const isEmergencyClosed = pos.status === "EMERGENCY_CLOSED";
          const isRebalancing = pos.status === "REBALANCING";

          // Calculate price pointer within Range bar
          let pricePointerPct = 50;
          if (pos.upperPrice > pos.lowerPrice) {
            const rawPct =
              ((pos.currentPrice - pos.lowerPrice) / (pos.upperPrice - pos.lowerPrice)) *
              100;
            pricePointerPct = Math.max(0, Math.min(100, rawPct));
          }

          return (
            <div
              key={pos.id}
              className={`p-5 rounded-3xl border transition-all space-y-4 relative overflow-hidden flex flex-col justify-between ${
                isEmergencyClosed
                  ? "bg-zinc-950/70 border-zinc-800/80 opacity-60"
                  : isOutOfRange
                  ? "bg-gradient-to-b from-amber-950/20 to-zinc-950/80 border-amber-500/40 shadow-xl shadow-amber-500/5"
                  : "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 shadow-xl"
              }`}
            >
              <div className="space-y-3.5">
                {/* Header card */}
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-zinc-800/80">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-base text-white font-mono tracking-tight">
                        {pos.tokenPair}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-purple-300 font-mono font-bold">
                        {pos.dex === "METEORA_DLMM"
                          ? "Meteora"
                          : pos.dex === "FLUXBEAM"
                          ? "FluxBeam"
                          : pos.dex === "RAYDIUM_CLMM"
                          ? "Raydium"
                          : "Orca"}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400 font-sans block mt-0.5">
                      Strategy: <strong className="text-zinc-200">{pos.strategyType.replace("_", " ")}</strong>
                    </span>
                  </div>

                  {/* Status Indicator Badge */}
                  <div>
                    <span
                      className={`text-[10px] font-mono px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1.5 ${
                        isEmergencyClosed
                          ? "bg-red-500/10 text-red-400 border border-red-500/30"
                          : isOutOfRange
                          ? "bg-amber-500/10 text-amber-300 border border-amber-500/40 animate-pulse"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          isEmergencyClosed
                            ? "bg-red-400"
                            : isOutOfRange
                            ? "bg-amber-400"
                            : "bg-emerald-400 animate-ping"
                        }`}
                      />
                      <span>
                        {isEmergencyClosed
                          ? "EMERGENCY CLOSED"
                          : isOutOfRange
                          ? "OUT OF RANGE"
                          : "IN RANGE"}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-0.5">
                    <span className="text-zinc-500 text-[10px] block font-sans">Deposited Capital</span>
                    <span className="text-white font-bold text-sm">{pos.depositAmountSol} SOL</span>
                    <span className="text-zinc-500 text-[10px] block font-sans">
                      ≈ ${pos.currentValueUsd.toFixed(1)}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-0.5">
                    <span className="text-zinc-500 text-[10px] block font-sans">Fee APR</span>
                    <span className="text-emerald-400 font-bold text-sm">+{pos.currentApr}%</span>
                    <span className="text-zinc-500 text-[10px] block font-sans">
                      Compound: {pos.autoCompound ? "On" : "Off"}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-0.5">
                    <span className="text-zinc-500 text-[10px] block font-sans">Unclaimed Fees</span>
                    <span className="text-emerald-400 font-bold text-sm">
                      +{pos.unclaimedFeesSol.toFixed(4)} SOL
                    </span>
                    <span className="text-zinc-500 text-[10px] block font-sans">
                      Claimed: +{pos.earnedFeesSol.toFixed(3)} SOL
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-0.5">
                    <span className="text-zinc-500 text-[10px] block font-sans">Impermanent Loss</span>
                    <span
                      className={`font-bold text-sm ${
                        pos.impermanentLossPct < -1 ? "text-red-400" : "text-zinc-300"
                      }`}
                    >
                      {pos.impermanentLossPct}%
                    </span>
                    <span className="text-zinc-500 text-[10px] block font-sans">
                      Net: +{(pos.earnedFeesSol + pos.unclaimedFeesSol).toFixed(3)} SOL
                    </span>
                  </div>
                </div>

                {/* Range Visualization Bar */}
                <div className="p-3 rounded-2xl bg-zinc-950/50 border border-zinc-800/80 space-y-2 text-[11px] font-mono">
                  <div className="flex justify-between items-center text-zinc-400">
                    <span>Floor: ${pos.lowerPrice}</span>
                    <span className="text-white font-bold">Price: ${pos.currentPrice}</span>
                    <span>Ceiling: ${pos.upperPrice}</span>
                  </div>

                  <div className="relative h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                    {/* Active range bar */}
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOutOfRange ? "bg-amber-500/40" : "bg-emerald-500/40"
                      }`}
                      style={{ width: "100%" }}
                    />
                    {/* Current price marker */}
                    <div
                      className={`absolute top-0 bottom-0 w-2 -ml-1 rounded-full shadow-md ${
                        isOutOfRange ? "bg-amber-400" : "bg-emerald-400"
                      }`}
                      style={{ left: `${pricePointerPct}%` }}
                      title={`Current Price: $${pos.currentPrice}`}
                    />
                  </div>

                  {isOutOfRange && (
                    <div className="text-[10px] text-amber-400 font-sans flex items-center gap-1 pt-0.5">
                      <AlertTriangle className="size-3 flex-shrink-0" />
                      <span>Position stopped earning fees (Out of Range). Rebalance now!</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {!isEmergencyClosed && (
                <div className="flex items-center gap-2 pt-3 border-t border-zinc-800/80 mt-2">
                  <button
                    disabled={pos.unclaimedFeesSol <= 0}
                    onClick={() => onHarvest(pos.id)}
                    className="flex-1 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Sparkles className="size-3.5" />
                    <span>Harvest ({pos.unclaimedFeesSol.toFixed(3)})</span>
                  </button>

                  <button
                    onClick={() => handleOpenRebalanceModal(pos)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      isOutOfRange
                        ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40 animate-bounce"
                        : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700"
                    }`}
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Rebalance</span>
                  </button>

                  <button
                    onClick={() => onEmergencyExit(pos.id)}
                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs transition-all cursor-pointer"
                    title="Panic Exit: Withdraw all LP liquidity back to SOL"
                  >
                    <ShieldAlert className="size-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Rebalance Modal */}
      {rebalancingPos && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setRebalancingPos(null)}
              className="absolute top-5 right-5 p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <X className="size-5" />
            </button>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono font-bold mb-2">
                <RotateCcw className="size-3" />
                <span>Rebalance Bins 50:50</span>
              </div>
              <h2 className="text-lg font-black text-white">
                Rebalance Position: {rebalancingPos.tokenPair}
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Sub-Wallet will withdraw current LP, rebalance token ratio 50:50 at spot market price, and re-deposit into a fresh active band.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex justify-between items-center text-zinc-300 font-semibold">
                  <span>New range bounds around current price:</span>
                  <span className="font-mono text-amber-300 font-bold">
                    {customRangeMin}% to +{customRangeMax}%
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={customRangeMin}
                    onChange={(e) => setCustomRangeMin(parseFloat(e.target.value) || -5)}
                    className="w-1/2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono text-xs"
                    placeholder="Min %"
                  />
                  <input
                    type="number"
                    value={customRangeMax}
                    onChange={(e) => setCustomRangeMax(parseFloat(e.target.value) || 5)}
                    className="w-1/2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono text-xs"
                    placeholder="Max %"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
                <Lock className="size-3 text-emerald-400" />
                <span>Autonomous execution via Sub-Wallet Vault</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setRebalancingPos(null)}
                className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRebalance}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-purple-500 hover:from-amber-400 hover:to-purple-400 text-black font-extrabold text-xs shadow-lg transition-all cursor-pointer font-sans"
              >
                Confirm Rebalance Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
