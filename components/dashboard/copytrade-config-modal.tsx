"use client";

import React, { useState, useEffect } from "react";
import { X, ShieldAlert, ShieldCheck, Zap, Sliders, TrendingUp, AlertTriangle, CheckCircle2, DollarSign, Clock, ArrowRight, Coins } from "lucide-react";
import { CopyTradeConfig, DEFAULT_COPY_TRADE_CONFIG, saveCopyTradeConfig, getSavedConfigs } from "@/lib/copytrade-engine";

interface CopyTradeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  whaleAddress: string;
  whaleName?: string;
  whaleWinRate?: string;
  subWalletBalance: number;
  onActivated: (config: CopyTradeConfig) => void;
  onOpenDepositModal?: (amount: number) => void;
}

export function CopyTradeConfigModal({
  isOpen,
  onClose,
  whaleAddress,
  whaleName = "Whale Wallet",
  whaleWinRate = "N/A",
  subWalletBalance,
  onActivated,
  onOpenDepositModal,
}: CopyTradeConfigModalProps) {
  const [config, setConfig] = useState<CopyTradeConfig>({
    ...DEFAULT_COPY_TRADE_CONFIG,
    targetWhaleAddress: whaleAddress,
    targetWhaleName: whaleName,
  });

  const [activeTab, setActiveTab] = useState<"BASIC" | "RISK" | "ANTI_RUG">("BASIC");

  useEffect(() => {
    if (whaleAddress) {
      const saved = getSavedConfigs()[whaleAddress];
      if (saved) {
        setConfig(saved);
      } else {
        setConfig({
          ...DEFAULT_COPY_TRADE_CONFIG,
          targetWhaleAddress: whaleAddress,
          targetWhaleName: whaleName,
        });
      }
    }
  }, [whaleAddress, whaleName]);

  if (!isOpen) return null;

  const handleSaveAndActivate = () => {
    if (config.maxSolPerTrade <= 0) {
      alert("Maximum volume per trade must be greater than 0 SOL");
      return;
    }
    if (subWalletBalance < config.maxSolPerTrade) {
      if (onOpenDepositModal) {
        const wantDeposit = confirm(
          `Sub-Wallet balance (${subWalletBalance.toFixed(3)} SOL) is lower than trade volume (${config.maxSolPerTrade} SOL).\nWould you like to deposit more SOL into Sub-Wallet now?`
        );
        if (wantDeposit) {
          onOpenDepositModal(Number((config.maxSolPerTrade - subWalletBalance + 0.1).toFixed(2)));
          return;
        }
      } else {
        const proceed = confirm(
          `Current sub-wallet balance (${subWalletBalance.toFixed(3)} SOL) is lower than trade volume (${config.maxSolPerTrade} SOL).\nDo you want to save this configuration and deposit SOL later?`
        );
        if (!proceed) return;
      }
    }

    saveCopyTradeConfig(config);
    onActivated(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex justify-between items-start bg-zinc-950/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Zap className="size-4" />
              </span>
              <h2 className="text-base font-bold text-white">Automated Copy Trade Delegation</h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5 font-mono">
              Tracking wallet: <span className="text-zinc-200 font-semibold">{whaleAddress.slice(0, 6)}...{whaleAddress.slice(-6)}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded border font-sans ${
                whaleWinRate.startsWith("-") || (parseFloat(whaleWinRate) > 0 && parseFloat(whaleWinRate) < 50)
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  : parseFloat(whaleWinRate) >= 60
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-zinc-800 text-zinc-300 border-zinc-700"
              }`}>
                Win Rate: {whaleWinRate || "N/A"}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Sub-wallet balance info & Quick Deposit */}
        <div className="bg-blue-950/20 border-b border-blue-900/30 px-5 py-2.5 flex items-center justify-between text-xs flex-wrap gap-2">
          <span className="text-zinc-400 flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            Trading Sub-Wallet:
          </span>
          <div className="flex items-center gap-2.5">
            <span className="font-mono font-bold text-blue-300">
              {subWalletBalance.toFixed(3)} SOL
            </span>
            {onOpenDepositModal && (
              <button
                type="button"
                onClick={() => onOpenDepositModal(config.maxSolPerTrade || 0.2)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold text-[11px] transition-colors cursor-pointer"
              >
                <Coins className="size-3" />
                <span>+ Nạp SOL</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/90 text-xs">
          <button
            onClick={() => setActiveTab("BASIC")}
            className={`flex-1 py-3 font-semibold text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "BASIC"
                ? "border-amber-400 text-amber-400 bg-amber-400/5"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Sliders className="size-3.5" />
            1. Trade Volume
          </button>
          <button
            onClick={() => setActiveTab("RISK")}
            className={`flex-1 py-3 font-semibold text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "RISK"
                ? "border-emerald-400 text-emerald-400 bg-emerald-400/5"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <TrendingUp className="size-3.5" />
            2. TP & Stop-Loss
          </button>
          <button
            onClick={() => setActiveTab("ANTI_RUG")}
            className={`flex-1 py-3 font-semibold text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "ANTI_RUG"
                ? "border-red-400 text-red-400 bg-red-400/5"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ShieldAlert className="size-3.5" />
            3. Anti-Rug Shield
          </button>
        </div>

        {/* Tab content */}
        <div className="p-5 space-y-4 text-xs">
          {activeTab === "BASIC" && (
            <div className="space-y-4">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  Maximum Volume per Trade (Max SOL per Trade)
                </label>
                <p className="text-[11px] text-zinc-400 mb-2">
                  Whether the whale buys 10 SOL or 100 SOL, the bot caps spend at this amount from the sub-wallet to control risk.
                </p>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[0.05, 0.1, 0.2, 0.5].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setConfig({ ...config, maxSolPerTrade: amt })}
                      className={`py-2 rounded-xl font-mono font-semibold border transition-all cursor-pointer ${
                        config.maxSolPerTrade === amt
                          ? "bg-amber-500/20 border-amber-500 text-amber-300"
                          : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                      }`}
                    >
                      {amt} SOL
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={config.maxSolPerTrade}
                    onChange={(e) => setConfig({ ...config, maxSolPerTrade: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-amber-400"
                  />
                  <span className="absolute right-3 top-2.5 text-zinc-400 font-mono text-xs">SOL</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Slippage Tolerance</label>
                  <select
                    value={config.slippagePct}
                    onChange={(e) => setConfig({ ...config, slippagePct: parseFloat(e.target.value) })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white text-xs cursor-pointer focus:outline-none focus:border-amber-400"
                  >
                    <option value={1.0}>1.0% (Tight)</option>
                    <option value={2.5}>2.5% (Standard)</option>
                    <option value={5.0}>5.0% (Volatile Memecoin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Transaction Speed (Gas Tip)</label>
                  <select
                    value={config.priorityFeeLevel}
                    onChange={(e) => setConfig({ ...config, priorityFeeLevel: e.target.value as any })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white text-xs cursor-pointer focus:outline-none focus:border-amber-400"
                  >
                    <option value="NORMAL">Normal (Economical)</option>
                    <option value="HIGH">High Priority (Recommended)</option>
                    <option value="TURBO_JITO">Turbo MEV Jito (Ultra Fast)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === "RISK" && (
            <div className="space-y-4">
              <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-red-400 font-semibold">
                  <AlertTriangle className="size-4" />
                  <span>Hard Stop-Loss (Strict Independent Cut-Loss)</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  If the token drops beyond this threshold, the bot immediately dumps 100% of the position. <strong className="text-zinc-200">Never wait for the whale to sell</strong> when price is in freefall.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="5"
                    max="40"
                    step="5"
                    value={config.hardStopLossPct}
                    onChange={(e) => setConfig({ ...config, hardStopLossPct: parseInt(e.target.value) })}
                    className="flex-1 accent-red-500 cursor-pointer"
                  />
                  <span className="font-mono font-bold text-red-400 bg-red-500/10 px-2.5 py-1 rounded border border-red-500/30">
                    -{config.hardStopLossPct}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-zinc-800/60 border border-zinc-700/60 rounded-xl">
                  <label className="block text-emerald-400 font-semibold mb-1">Take Profit Tier 1 (TP 1)</label>
                  <p className="text-[10px] text-zinc-400 mb-2">Sell {config.tp1SellRatio}% to recover initial capital</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-400 font-mono font-bold">+</span>
                    <input
                      type="number"
                      value={config.tp1Pct}
                      onChange={(e) => setConfig({ ...config, tp1Pct: parseInt(e.target.value) || 0 })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-white font-mono"
                    />
                    <span className="text-zinc-400">%</span>
                  </div>
                </div>

                <div className="p-3 bg-zinc-800/60 border border-zinc-700/60 rounded-xl">
                  <label className="block text-emerald-400 font-semibold mb-1">Take Profit Tier 2 (TP 2)</label>
                  <p className="text-[10px] text-zinc-400 mb-2">Sell remaining 100% to lock profit</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-400 font-mono font-bold">+</span>
                    <input
                      type="number"
                      value={config.tp2Pct}
                      onChange={(e) => setConfig({ ...config, tp2Pct: parseInt(e.target.value) || 0 })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-white font-mono"
                    />
                    <span className="text-zinc-400">%</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Daily Max Loss Limit</label>
                <p className="text-[11px] text-zinc-400 mb-1.5">
                  If total realized loss hits this limit, the bot auto-pauses tracking for the day to preserve capital.
                </p>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={config.dailyMaxLossSol}
                    onChange={(e) => setConfig({ ...config, dailyMaxLossSol: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono text-sm"
                  />
                  <span className="absolute right-3 top-2.5 text-zinc-400 font-mono text-xs">SOL</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "ANTI_RUG" && (
            <div className="space-y-3">
              <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-red-300 flex items-center gap-1.5">
                      <Zap className="size-3.5 text-amber-400" />
                      Instant Exit on Whale Sell
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Detects whale sell block and sends SELL order in same block with high gas tip to avoid getting dumped on.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.instantExitOnWhaleSell}
                    onChange={(e) => setConfig({ ...config, instantExitOnWhaleSell: e.target.checked })}
                    className="size-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-3 bg-zinc-800/60 border border-zinc-700/60 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-zinc-200">Minimum Pool Liquidity (Min Liquidity)</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Auto-rejects copy trade if DEX pool liquidity is too low (prevents low liquidity honeypots).
                    </p>
                  </div>
                  <div className="text-right">
                    <input
                      type="number"
                      step="1000"
                      value={config.minPoolLiquidityUsd}
                      onChange={(e) => setConfig({ ...config, minPoolLiquidityUsd: parseInt(e.target.value) || 0 })}
                      className="w-24 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-right text-white font-mono text-xs"
                    />
                    <span className="text-[10px] text-zinc-400 block">$ USD</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-zinc-800/60 border border-zinc-700/60 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-zinc-200">Max Holding Time Limit</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      If price doesn't gain momentum within this time, the bot auto-exits to reclaim SOL capital.
                    </p>
                  </div>
                  <div className="text-right">
                    <input
                      type="number"
                      min="5"
                      max="180"
                      value={config.maxHoldingTimeMinutes}
                      onChange={(e) => setConfig({ ...config, maxHoldingTimeMinutes: parseInt(e.target.value) || 0 })}
                      className="w-20 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-right text-white font-mono text-xs"
                    />
                    <span className="text-[10px] text-zinc-400 block">Minutes</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-zinc-800/60 border border-zinc-700/60 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-zinc-200">Sudden Liquidity Drain Shield (Liquidity Rug)</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      If DEX pool liquidity drains over 20% in 1 minute, trigger instant emergency exit.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                    -20% Pool
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAndActivate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-zinc-950 font-bold text-xs transition-all shadow-lg shadow-emerald-950/30 cursor-pointer"
          >
            <ShieldCheck className="size-4" />
            Activate Copy Trade Bot
          </button>
        </div>
      </div>
    </div>
  );
}
