"use client";

import { useState } from "react";
import { LpPoolData, simulateConcentratedIL } from "@/lib/lp-agent-engine";
import {
  X,
  Calculator,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Percent,
  Calendar,
  DollarSign,
  Info,
} from "lucide-react";

interface IlCalculatorModalProps {
  pool: LpPoolData | null;
  isOpen: boolean;
  onClose: () => void;
  onDeployFromCalculator?: (pool: LpPoolData) => void;
}

export function IlCalculatorModal({
  pool,
  isOpen,
  onClose,
  onDeployFromCalculator,
}: IlCalculatorModalProps) {
  if (!isOpen || !pool) return null;

  const [priceChangePct, setPriceChangePct] = useState<number>(15);
  const [lowerRangePct, setLowerRangePct] = useState<number>(pool.dex === "METEORA_DLMM" ? -5 : -15);
  const [upperRangePct, setUpperRangePct] = useState<number>(pool.dex === "METEORA_DLMM" ? 5 : 15);
  const [holdingDays, setHoldingDays] = useState<number>(14);
  const [depositSol, setDepositSol] = useState<number>(1.0);

  const initialPrice = pool.currentPrice;
  const newPrice = initialPrice * (1 + priceChangePct / 100);
  const lowerPrice = initialPrice * (1 + lowerRangePct / 100);
  const upperPrice = initialPrice * (1 + upperRangePct / 100);

  const simResult = simulateConcentratedIL(
    initialPrice,
    newPrice,
    lowerPrice,
    upperPrice,
    pool.feeApr24h,
    holdingDays,
    depositSol
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="size-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-mono font-bold">
            <Calculator className="size-3.5" />
            <span>Impermanent Loss & Yield Simulator</span>
          </div>
          <h2 className="text-lg font-black text-white">
            {pool.tokenA.symbol} / {pool.tokenB.symbol} ({pool.dex.replace("_", " ")})
          </h2>
          <p className="text-xs text-zinc-400">
            Simulate net yield (Fee APR minus Impermanent Loss) across concentrated liquidity ranges and price shifts.
          </p>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Capital & Holding Days */}
          <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-3">
            <div className="space-y-1.5">
              <label className="text-zinc-300 font-semibold flex justify-between">
                <span>Capital Deposit (SOL):</span>
                <span className="font-mono text-emerald-400 font-bold">{depositSol} SOL</span>
              </label>
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={depositSol}
                onChange={(e) => setDepositSol(parseFloat(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-300 font-semibold flex justify-between">
                <span>Holding Period (Days):</span>
                <span className="font-mono text-purple-300 font-bold">{holdingDays} Days</span>
              </label>
              <input
                type="range"
                min="1"
                max="90"
                step="1"
                value={holdingDays}
                onChange={(e) => setHoldingDays(parseInt(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Price Range Bounds */}
          <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-3">
            <div className="space-y-1.5">
              <label className="text-zinc-300 font-semibold flex justify-between">
                <span>Price Range Min/Max:</span>
                <span className="font-mono text-amber-300 font-bold">
                  {lowerRangePct}% to +{upperRangePct}%
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={lowerRangePct}
                  onChange={(e) => setLowerRangePct(parseFloat(e.target.value) || -10)}
                  className="w-1/2 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono text-xs"
                  placeholder="Min %"
                />
                <input
                  type="number"
                  value={upperRangePct}
                  onChange={(e) => setUpperRangePct(parseFloat(e.target.value) || 10)}
                  className="w-1/2 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono text-xs"
                  placeholder="Max %"
                />
              </div>
            </div>

            {/* Current Reference Price */}
            <div className="text-[11px] text-zinc-400 font-mono pt-1">
              Spot Price: <strong className="text-white">${initialPrice}</strong>
            </div>
          </div>
        </div>

        {/* Projected Price Shift Slider */}
        <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-zinc-300 font-semibold">Projected Token Price Shift ({pool.tokenA.symbol}):</span>
            <span
              className={`font-mono font-bold text-sm ${
                priceChangePct >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {priceChangePct >= 0 ? `+${priceChangePct}%` : `${priceChangePct}%`} (New Price: ${newPrice.toFixed(6)})
            </span>
          </div>
          <input
            type="range"
            min="-60"
            max="120"
            step="1"
            value={priceChangePct}
            onChange={(e) => setPriceChangePct(parseInt(e.target.value))}
            className="w-full accent-purple-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
            <span>-60% (Dump)</span>
            <span>0% (Flat)</span>
            <span>+60%</span>
            <span>+120% (Breakout)</span>
          </div>
        </div>

        {/* Simulation Output Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-0.5">
            <span className="text-zinc-500 text-[10px] block font-sans">Range Status</span>
            <span
              className={`font-bold text-xs ${
                simResult.isOutOfRange ? "text-amber-400" : "text-emerald-400"
              }`}
            >
              {simResult.isOutOfRange ? "▲ OUT OF RANGE" : "● IN RANGE"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-0.5">
            <span className="text-zinc-500 text-[10px] block font-sans">Impermanent Loss</span>
            <span
              className={`font-bold text-xs ${
                simResult.concentratedIlPct < -1 ? "text-red-400" : "text-zinc-300"
              }`}
            >
              {simResult.concentratedIlPct}%
            </span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-0.5">
            <span className="text-zinc-500 text-[10px] block font-sans">Estimated Fees</span>
            <span className="font-bold text-emerald-400 text-xs">
              +{(depositSol * (pool.feeApr24h / 365 / 100) * holdingDays * (simResult.isOutOfRange ? 0.3 : 1)).toFixed(4)} SOL
            </span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-0.5">
            <span className="text-zinc-500 text-[10px] block font-sans">Net PnL Yield</span>
            <span
              className={`font-bold text-xs ${
                simResult.netYieldSol >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {simResult.netYieldSol >= 0 ? `+${simResult.netYieldSol} SOL` : `${simResult.netYieldSol} SOL`}
            </span>
          </div>
        </div>

        {/* Token Ratio Composition Bar */}
        <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800 space-y-2 text-xs">
          <div className="flex justify-between items-center text-[11px] font-sans">
            <span className="text-zinc-400">
              Position Asset Composition:
            </span>
            <span className="font-mono text-zinc-300">
              {pool.tokenA.symbol} ({simResult.tokenARatioPct}%) / {pool.tokenB.symbol} ({simResult.tokenBRatioPct}%)
            </span>
          </div>
          <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${simResult.tokenARatioPct}%` }}
              className="bg-purple-500 transition-all duration-300 h-full"
              title={`${pool.tokenA.symbol}: ${simResult.tokenARatioPct}%`}
            />
            <div
              style={{ width: `${simResult.tokenBRatioPct}%` }}
              className="bg-emerald-500 transition-all duration-300 h-full"
              title={`${pool.tokenB.symbol}: ${simResult.tokenBRatioPct}%`}
            />
          </div>
          {simResult.isOutOfRange && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-400 pt-1">
              <AlertTriangle className="size-3.5 flex-shrink-0" />
              <span>
                Price has drifted out of active bins. The autonomous agent will automatically trigger 50:50 rebalancing.
              </span>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
          {onDeployFromCalculator && (
            <button
              onClick={() => {
                onClose();
                onDeployFromCalculator(pool);
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-emerald-500 hover:from-purple-400 hover:to-emerald-400 text-black font-extrabold text-xs shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Deploy Position</span>
              <ArrowRight className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
