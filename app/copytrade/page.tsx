"use client";

import { useState, useEffect } from "react";
import { WhaleDiscoveryPanel } from "@/components/dashboard/whale-discovery-panel";
import { CopyTradeConfigModal } from "@/components/dashboard/copytrade-config-modal";
import { DepositSubWalletModal } from "@/components/wallet/deposit-subwallet-modal";
import { useSolanaWallet } from "@/components/wallet/wallet-context";
import { getSubWallet, fetchSubWalletBalance, recordSubWalletDeduction } from "@/lib/sub-wallet-manager";
import {
  CopyTradeConfig,
  CopyTradePosition,
  getSavedPositions,
  savePositions,
} from "@/lib/copytrade-engine";
import { formatCurrency, formatSol } from "@/lib/format-utils";
import {
  Zap,
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  TrendingUp,
  Activity,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Sliders,
  Filter,
  PlusCircle,
  Coins,
} from "lucide-react";

export default function CopyTradePage() {
  const { walletAddress, isConnected } = useSolanaWallet();
  const [subWalletBalance, setSubWalletBalance] = useState<number>(0);
  const [selectedWhaleForConfig, setSelectedWhaleForConfig] = useState<{
    address: string;
    name?: string;
    winRate?: string;
    specificTx?: any;
  } | null>(null);

  const [positions, setPositions] = useState<CopyTradePosition[]>([]);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // Deposit modal state
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositTargetDesc, setDepositTargetDesc] = useState<string>("Uỷ thác giao dịch Copy-Trade cá voi");
  const [depositRecommendedAmt, setDepositRecommendedAmt] = useState<number>(0.3);

  const refreshBalance = () => {
    if (walletAddress) {
      const sw = getSubWallet(walletAddress);
      if (sw) {
        fetchSubWalletBalance(sw.publicKey, walletAddress).then(setSubWalletBalance);
      }
    } else {
      setSubWalletBalance(0);
    }
  };

  useEffect(() => {
    refreshBalance();
    setPositions(getSavedPositions());

    const handlePositionsUpdate = () => {
      setPositions(getSavedPositions());
    };
    const handleSubBalanceUpdate = (e: any) => {
      if (e?.detail?.balance !== undefined) {
        setSubWalletBalance(e.detail.balance);
      } else {
        refreshBalance();
      }
    };

    window.addEventListener("solana_copytrade_positions_updated", handlePositionsUpdate);
    window.addEventListener("solana_subwallet_balance_updated", handleSubBalanceUpdate);
    return () => {
      window.removeEventListener("solana_copytrade_positions_updated", handlePositionsUpdate);
      window.removeEventListener("solana_subwallet_balance_updated", handleSubBalanceUpdate);
    };
  }, [walletAddress]);

  const handleOpenConfigModal = (whale: {
    address: string;
    name?: string;
    winRate?: string;
    specificTx?: any;
  }) => {
    setSelectedWhaleForConfig(whale);
  };

  const handleConfigActivated = (config: CopyTradeConfig) => {
    // Trừ số dư sub-wallet tương ứng với lệnh uỷ thác mở
    if (walletAddress && config.maxSolPerTrade > 0) {
      recordSubWalletDeduction(walletAddress, config.maxSolPerTrade);
    }

    if (selectedWhaleForConfig?.specificTx) {
      const tx = selectedWhaleForConfig.specificTx;
      const currentPositions = getSavedPositions();
      const rawPrice = tx.entryPriceUsd || parseFloat(tx.price?.replace(/[^0-9.]/g, "") || "0");
      const entryPrice = rawPrice > 0 ? rawPrice : 1.25;
      const rawCurrentPrice = tx.currentPriceUsd || parseFloat(tx.currentPrice?.replace(/[^0-9.]/g, "") || "0");
      const currentPrice = rawCurrentPrice > 0 ? rawCurrentPrice : entryPrice;
      const pnl = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;

      const newPos: CopyTradePosition = {
        id: `pos_${Date.now()}`,
        whaleAddress: selectedWhaleForConfig.address,
        tokenSymbol: tx.tokenSymbol || "TOKEN",
        tokenMint: tx.tokenMint || "So11111111111111111111111111111111111111112",
        entrySolAmount: config.maxSolPerTrade,
        entryPriceUsd: entryPrice,
        currentPriceUsd: currentPrice,
        highestPriceUsd: Math.max(entryPrice, currentPrice),
        pnlPct: Number(pnl.toFixed(1)),
        entryTime: Date.now(),
        status: "OPEN",
        dex: tx.platform || "Raydium V4",
      };
      savePositions([newPos, ...currentPositions]);
      setPositions([newPos, ...currentPositions]);
    }

    setToastNotification(
      `Copy-trading activated for whale ${config.targetWhaleAddress.slice(0, 6)}... (Size: ${config.maxSolPerTrade} SOL, Stop-Loss: -${config.hardStopLossPct}%, TP1: +${config.tp1Pct}%)`
    );
    setTimeout(() => setToastNotification(null), 5000);
    setSelectedWhaleForConfig(null);
  };

  const handleSellPosition = (id: string) => {
    const target = positions.find((p) => p.id === id);
    if (!target) return;
    const confirmSell = confirm(`Confirm selling all ${target.tokenSymbol} tokens to reclaim SOL?`);
    if (!confirmSell) return;

    const updated = positions.map((p) => {
      if (p.id === id) {
        return {
          ...p,
          status: "CLOSED_TP" as const,
          closeReason: "Manual exit via Sell Now button",
        };
      }
      return p;
    });
    setPositions(updated);
    savePositions(updated);
  };

  const handlePanicSellAll = () => {
    const confirmPanic = confirm(
      "WARNING: Emergency sell all open copy-trade positions and withdraw SOL back to Sub-Wallet?"
    );
    if (!confirmPanic) return;

    const closed = positions.map((p) => ({
      ...p,
      status: "CLOSED_PANIC" as const,
      closeReason: "Emergency: User triggered Panic Sell All",
    }));
    setPositions(closed);
    savePositions(closed);
  };

  const openPositions = positions.filter((p) => p.status === "OPEN" || p.status === "TP1_TAKEN");

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 pt-6 pb-28 sm:pb-32 space-y-6">
      {/* Toast Notification */}
      {toastNotification && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-[calc(100vw-2rem)] sm:max-w-md p-4 rounded-xl bg-amber-500 text-black font-bold text-xs shadow-2xl flex items-center gap-2 border border-amber-300">
          <CheckCircle2 className="size-4 shrink-0" />
          <span className="leading-snug">{toastNotification}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Zap className="size-5" />
            </div>
            <h1 className="text-xl font-black text-white">Whale Copy-Trade Hub</h1>
          </div>
          <p className="text-xs text-zinc-400">
            Track elite smart wallets with Win Rate &gt; 70%, automated real-time swap mirroring, and Anti-Rug capital guards.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800">
            <span className="text-zinc-500">Sub-Wallet Vault:</span>
            <span className="text-emerald-400 font-bold">{formatSol(subWalletBalance)}</span>
          </div>
          <button
            onClick={() => {
              setDepositTargetDesc("Uỷ thác sao chép lệnh cá voi");
              setDepositRecommendedAmt(0.3);
              setIsDepositOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-extrabold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Coins className="size-3.5" />
            <span>Nạp SOL vào Sub-Wallet</span>
          </button>
        </div>
      </div>

      {/* 5.2 Active Positions Table */}
      {openPositions.length > 0 && (
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <TrendingUp className="size-4" />
              </div>
              <h2 className="text-sm font-bold text-white">
                Active Copy-Trade Positions ({openPositions.length})
              </h2>
            </div>

            <button
              onClick={handlePanicSellAll}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <AlertOctagon className="size-3.5" />
              <span>Panic Sell All (Close All)</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase text-zinc-500 border-b border-zinc-800">
                <tr>
                  <th className="pb-2">Token</th>
                  <th className="pb-2">DEX</th>
                  <th className="pb-2">Size</th>
                  <th className="pb-2">Entry Price</th>
                  <th className="pb-2">Current Price</th>
                  <th className="pb-2">PnL</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {openPositions.map((pos) => (
                  <tr key={pos.id} className="hover:bg-zinc-800/30">
                    <td className="py-2.5 font-bold text-white">{pos.tokenSymbol}</td>
                    <td className="py-2.5 text-zinc-400">{pos.dex}</td>
                    <td className="py-2.5 text-zinc-300">{formatSol(pos.entrySolAmount)}</td>
                    <td className="py-2.5 text-zinc-400">{formatCurrency(pos.entryPriceUsd, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                    <td className="py-2.5 text-white">{formatCurrency(pos.currentPriceUsd, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                    <td className="py-2.5">
                      <span
                        className={`font-bold ${
                          (pos.pnlPct || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {(pos.pnlPct || 0) >= 0 ? `+${pos.pnlPct}%` : `${pos.pnlPct}%`}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => handleSellPosition(pos.id)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-[11px] font-sans font-semibold transition-colors cursor-pointer"
                      >
                        Close Position
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Whale Discovery Panel */}
      <div className="space-y-4">
        <WhaleDiscoveryPanel
          onOpenConfigModal={handleOpenConfigModal}
        />
      </div>

      {/* Copy Trade Config Modal */}
      {selectedWhaleForConfig && (
        <CopyTradeConfigModal
          isOpen={!!selectedWhaleForConfig}
          onClose={() => setSelectedWhaleForConfig(null)}
          whaleAddress={selectedWhaleForConfig.address}
          whaleName={selectedWhaleForConfig.name || "Smart Whale"}
          whaleWinRate={selectedWhaleForConfig.winRate || "N/A"}
          subWalletBalance={subWalletBalance}
          onActivated={handleConfigActivated}
          onOpenDepositModal={(amt) => {
            setDepositTargetDesc(`Uỷ thác giao dịch ${amt} SOL cho cá voi ${selectedWhaleForConfig.address.slice(0, 6)}...`);
            setDepositRecommendedAmt(amt);
            setIsDepositOpen(true);
          }}
        />
      )}

      {/* Deposit to Sub-Wallet Modal */}
      <DepositSubWalletModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        targetDescription={depositTargetDesc}
        recommendedAmount={depositRecommendedAmt}
        onSuccess={(newBal) => {
          setSubWalletBalance(newBal);
          setToastNotification(`Đã nạp thành công! Số dư Sub-Wallet hiện tại: ${newBal.toFixed(3)} SOL`);
          setTimeout(() => setToastNotification(null), 4000);
        }}
      />
    </div>
  );
}
