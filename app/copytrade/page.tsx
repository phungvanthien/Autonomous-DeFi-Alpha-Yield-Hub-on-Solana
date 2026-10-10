"use client";

import { useState, useEffect } from "react";
import { WhaleDiscoveryPanel } from "@/components/dashboard/whale-discovery-panel";
import { CopyTradeConfigModal } from "@/components/dashboard/copytrade-config-modal";
import { DepositSubWalletModal } from "@/components/wallet/deposit-subwallet-modal";
import { WithdrawSubWalletModal } from "@/components/wallet/withdraw-subwallet-modal";
import { useSolanaWallet } from "@/components/wallet/wallet-context";
import { getSubWallet, fetchSubWalletBalance, recordSubWalletDeduction } from "@/lib/sub-wallet-manager";
import { executeSubWalletBuyToken, executeSubWalletSellToken } from "@/lib/jupiter-swap-router";
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
  ArrowUpRight,
} from "lucide-react";

export default function CopyTradePage() {
  const { walletAddress, isConnected, network } = useSolanaWallet();
  const [subWalletBalance, setSubWalletBalance] = useState<number>(0);
  const [selectedWhaleForConfig, setSelectedWhaleForConfig] = useState<{
    address: string;
    name?: string;
    winRate?: string;
    specificTx?: any;
  } | null>(null);

  const [positions, setPositions] = useState<CopyTradePosition[]>([]);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // Deposit & Withdraw modal state
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositTargetDesc, setDepositTargetDesc] = useState<string>("Whale Copy-Trade Delegation");
  const [depositRecommendedAmt, setDepositRecommendedAmt] = useState<number>(0.3);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  const refreshBalance = () => {
    if (walletAddress) {
      const sw = getSubWallet(walletAddress);
      if (sw) {
        fetchSubWalletBalance(sw.publicKey, walletAddress, network).then(setSubWalletBalance);
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
  }, [walletAddress, network]);

  const handleOpenConfigModal = (whale: {
    address: string;
    name?: string;
    winRate?: string;
    specificTx?: any;
  }) => {
    setSelectedWhaleForConfig(whale);
  };

  const handleConfigActivated = async (config: CopyTradeConfig) => {
    let txSig: string | undefined = undefined;
    let solscanUrl: string | undefined = undefined;
    let isLive: boolean = false;

    // Thực thi lệnh Mua qua Jupiter Swap Router nếu có Sub-Wallet
    if (walletAddress && config.maxSolPerTrade > 0) {
      const sw = getSubWallet(walletAddress);
      if (sw) {
        const tokenMint = selectedWhaleForConfig?.specificTx?.tokenMint || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
        const swapRes = await executeSubWalletBuyToken(
          sw,
          tokenMint,
          config.maxSolPerTrade,
          config.slippagePct || 2.5
        );
        if (swapRes.success) {
          txSig = swapRes.signature;
          solscanUrl = swapRes.solscanUrl;
          isLive = !swapRes.isSimulated;
        }
      } else {
        recordSubWalletDeduction(walletAddress, config.maxSolPerTrade);
      }
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
        tokenMint: tx.tokenMint || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        entrySolAmount: config.maxSolPerTrade,
        entryPriceUsd: entryPrice,
        currentPriceUsd: currentPrice,
        highestPriceUsd: Math.max(entryPrice, currentPrice),
        pnlPct: Number(pnl.toFixed(1)),
        entryTime: Date.now(),
        status: "OPEN",
        dex: tx.platform || "Raydium V4",
        txSignature: txSig,
        solscanUrl: solscanUrl,
        isLiveOnChain: isLive,
      };
      savePositions([newPos, ...currentPositions]);
      setPositions([newPos, ...currentPositions]);
    }

    refreshBalance();

    const modeText = isLive ? "LIVE ON-CHAIN ⚡" : "SIMULATED";
    setToastNotification(
      `[${modeText}] Copy-trading activated for whale ${config.targetWhaleAddress.slice(0, 6)}... (Size: ${config.maxSolPerTrade} SOL, Stop-Loss: -${config.hardStopLossPct}%, TP1: +${config.tp1Pct}%)`
    );
    setTimeout(() => setToastNotification(null), 5000);
    setSelectedWhaleForConfig(null);
  };

  const handleSellPosition = async (id: string) => {
    const target = positions.find((p) => p.id === id);
    if (!target) return;
    const confirmSell = confirm(`Confirm selling all ${target.tokenSymbol} tokens to reclaim SOL via Jupiter Router?`);
    if (!confirmSell) return;

    if (walletAddress) {
      const sw = getSubWallet(walletAddress);
      if (sw) {
        const estSol = target.entrySolAmount * (1 + (target.pnlPct || 0) / 100);
        await executeSubWalletSellToken(sw, target.tokenMint, estSol, 3.0);
        refreshBalance();
      }
    }

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

  const handlePanicSellAll = async () => {
    const confirmPanic = confirm(
      "WARNING: Emergency sell all open copy-trade positions and withdraw SOL back to Sub-Wallet via DEX?"
    );
    if (!confirmPanic) return;

    if (walletAddress) {
      const sw = getSubWallet(walletAddress);
      if (sw) {
        for (const p of openPositions) {
          const estSol = p.entrySolAmount * (1 + (p.pnlPct || 0) / 100);
          await executeSubWalletSellToken(sw, p.tokenMint, estSol, 5.0);
        }
        refreshBalance();
      }
    }

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
    <div
      suppressHydrationWarning
      className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 pt-6 pb-28 sm:pb-32 space-y-6"
    >
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
              setDepositTargetDesc("Whale Copy-Trade Delegation");
              setDepositRecommendedAmt(0.3);
              setIsDepositOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-extrabold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Coins className="size-3.5" />
            <span>Deposit SOL</span>
          </button>
          <button
            onClick={() => setIsWithdrawOpen(true)}
            disabled={subWalletBalance <= 0.005}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
            title="Withdraw capital from Sub-Wallet back to primary wallet"
          >
            <ArrowUpRight className="size-3.5 text-blue-400" />
            <span>Withdraw Funds</span>
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
                    <td className="py-2.5 font-bold text-white">
                      <div className="flex items-center gap-1.5">
                        <span>{pos.tokenSymbol}</span>
                        {pos.isLiveOnChain && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono">
                            LIVE
                          </span>
                        )}
                        {pos.solscanUrl && (
                          <a
                            href={pos.solscanUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-zinc-500 hover:text-amber-400 transition-colors"
                            title="Xem giao dịch on-chain trên Solscan"
                          >
                            <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>
                    </td>
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
            setDepositTargetDesc(`Delegate ${amt} SOL trading to whale ${selectedWhaleForConfig.address.slice(0, 6)}...`);
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
          setToastNotification(`Deposit successful! Current Sub-Wallet balance: ${newBal.toFixed(3)} SOL`);
          setTimeout(() => setToastNotification(null), 4000);
        }}
      />

      {/* Withdraw from Sub-Wallet Modal */}
      <WithdrawSubWalletModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        onSuccess={(newBal) => {
          setSubWalletBalance(newBal);
          setToastNotification(`Withdrawal successful! Remaining Sub-Wallet balance: ${newBal.toFixed(3)} SOL`);
          setTimeout(() => setToastNotification(null), 4000);
        }}
      />
    </div>
  );
}
