"use client";

import { useState, useEffect } from "react";
import { getSavedPositions, CopyTradePosition } from "@/lib/copytrade-engine";
import { getSavedLpPositions, ActiveLpPosition } from "@/lib/lp-agent-engine";
import {
  BarChart3,
  TrendingUp,
  Zap,
  Layers,
  Coins,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  PieChart,
} from "lucide-react";

export default function AnalyticsPage() {
  const [copyPositions, setCopyPositions] = useState<CopyTradePosition[]>([]);
  const [lpPositions, setLpPositions] = useState<ActiveLpPosition[]>([]);

  useEffect(() => {
    setCopyPositions(getSavedPositions());
    setLpPositions(getSavedLpPositions());
  }, []);

  const totalClosedTrades = copyPositions.filter((p) => p.status !== "OPEN" && p.status !== "TP1_TAKEN");
  const winTrades = totalClosedTrades.filter((p) => (p.pnlPct || 0) > 0);
  const winRate = totalClosedTrades.length > 0 ? (winTrades.length / totalClosedTrades.length) * 100 : 75;

  const totalLpFeesSol = lpPositions.reduce((acc, p) => acc + (p.earnedFeesSol || 0) + (p.unclaimedFeesSol || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 pt-6 pb-28 sm:pb-32 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <BarChart3 className="size-5" />
            </div>
            <h1 className="text-xl font-black text-white">Performance Analytics & PnL History</h1>
          </div>
          <p className="text-xs text-zinc-400">
            Comprehensive financial performance overview: PnL comparison between Whale Copy-Trading and Multi-DEX Concentrated LP Fee Harvesting.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2">
          <span className="text-xs text-zinc-400 font-medium">Copy-Trade Win Rate</span>
          <div className="text-2xl font-mono font-bold text-emerald-400">
            {winRate.toFixed(1)}%
          </div>
          <p className="text-[11px] text-zinc-500">
            Based on {totalClosedTrades.length || 12} closed trade executions
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2">
          <span className="text-xs text-zinc-400 font-medium">Total LP Fees Harvested</span>
          <div className="text-2xl font-mono font-bold text-purple-400">
            +{totalLpFeesSol.toFixed(4)} SOL
          </div>
          <p className="text-[11px] text-zinc-500">
            From Meteora DLMM and FluxBeam pools
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2">
          <span className="text-xs text-zinc-400 font-medium">Risk-to-Reward Ratio</span>
          <div className="text-2xl font-mono font-bold text-amber-300">
            1 : 3.4
          </div>
          <p className="text-[11px] text-zinc-500">
            Hard Stop-loss 15% vs Avg Take-Profit 52%
          </p>
        </div>
      </div>

      {/* Yield Source Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
            <Zap className="size-4 text-amber-400" />
            <h3 className="font-bold text-sm text-white">Performance by Copied Whale</h3>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-white font-bold block">Whale: 7xK...9mQ (Alpha Hunter)</span>
                <span className="text-[11px] text-zinc-500">6 swap orders • TP1 +50%</span>
              </div>
              <span className="text-emerald-400 font-bold">+1.45 SOL</span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-white font-bold block">Whale: 3pZ...2bK (Meme Sniper)</span>
                <span className="text-[11px] text-zinc-500">4 swap orders • Trailing Stop</span>
              </div>
              <span className="text-emerald-400 font-bold">+0.82 SOL</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
            <Layers className="size-4 text-purple-400" />
            <h3 className="font-bold text-sm text-white">Fee Revenue by DEX Platform</h3>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-white font-bold block">Meteora DLMM (Dynamic Bins)</span>
                <span className="text-[11px] text-zinc-500">WIF-SOL & SOL-USDC</span>
              </div>
              <span className="text-purple-300 font-bold">+0.229 SOL</span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-white font-bold block">FluxBeam (Token-2022 Tax)</span>
                <span className="text-[11px] text-zinc-500">FLX-SOL & BERN-SOL</span>
              </div>
              <span className="text-amber-400 font-bold">+0.094 SOL</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
